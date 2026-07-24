import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");
const CAROUSEL_WIDTH = width - 32;

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function VisitorsCenterScreen() {
    const { brandData, visitorsData, apiStatus } = useAppContent();
    const bgColor = getValidColor(brandData?.brand_color_primary);
    const secColor = getValidColor(brandData?.brand_color__secondary);

    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const images: string[] = [];
    if (visitorsData?.image_gallery && Array.isArray(visitorsData.image_gallery)) {
        visitorsData.image_gallery.forEach((img: any) => {
            if (img?.url) images.push(img.url);
        });
    }

    const handlePrevSlide = () => {
        if (images.length <= 1) return;
        const newIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    const handleNextSlide = () => {
        if (images.length <= 1) return;
        const newIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    const handleOpenLink = (url: string | undefined) => {
        if (!url) return;
        Linking.openURL(url).catch((err) => console.error("Couldn't open link", err));
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: bgColor }}>
                <QuickLinks />
            </View>

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={bgColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header Row */}
                    {visitorsData?.screen_title ? (
                        <View style={styles.headerRow}>
                            <Image source={require("../../assets/images/house-flag.png")} style={styles.headerIcon} contentFit="contain" />
                            <Text style={[styles.sectionTitle, { color: bgColor }]}>
                                {visitorsData?.screen_title}
                            </Text>
                        </View>
                    ) : null}

                    {/* Image Gallery Slider */}
                    <View style={styles.carouselContainer}>
                        {images.length > 0 ? (
                            <>
                                <FlatList
                                    ref={flatListRef}
                                    data={images}
                                    keyExtractor={(item, index) => index.toString()}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e) => {
                                        const nextIndex = Math.round(
                                            e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH
                                        );
                                        setActiveIndex(nextIndex);
                                    }}
                                    renderItem={({ item }) => (
                                        <Image
                                            source={{ uri: item }}
                                            style={styles.carouselImage}
                                            contentFit="cover"
                                        />
                                    )}
                                />
                                {images.length > 1 && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.arrowButton, { left: 10 }]}
                                            onPress={handlePrevSlide}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="arrow-back" size={16} color="#333333" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.arrowButton, { right: 10 }]}
                                            onPress={handleNextSlide}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="arrow-forward" size={16} color="#333333" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        ) : null}
                    </View>

                    {/* Call to Actions (CTA) Cards */}
                    <View style={styles.ctaContainer}>
                        {/* CTA 1: Get Directions / Address */}
                        <TouchableOpacity
                            style={styles.ctaCard}
                            activeOpacity={0.9}
                            onPress={() => handleOpenLink(visitorsData?.cta_1_link)}
                        >
                            <View style={styles.ctaImagePlaceholder}>
                                <Ionicons name="navigate-circle-outline" size={32} color={bgColor} />
                            </View>
                            <View style={styles.ctaContent}>
                                <Text style={styles.ctaTitle} numberOfLines={1}>
                                    {visitorsData?.cta_1_label}
                                </Text>
                                <Text style={styles.ctaSubtitle} numberOfLines={1}>
                                    {visitorsData?.address}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* CTA 2: Call Us / Contact */}
                        <TouchableOpacity
                            style={styles.ctaCard}
                            activeOpacity={0.9}
                            onPress={() => handleOpenLink(visitorsData?.cta_2_link)}
                        >
                            <View style={styles.ctaImagePlaceholder}>
                                <Ionicons name="call-outline" size={30} color={bgColor} />
                            </View>
                            <View style={styles.ctaContent}>
                                <Text style={styles.ctaTitle} numberOfLines={1}>
                                    {visitorsData?.cta_2_label}
                                </Text>
                                <Text style={styles.ctaSubtitle} numberOfLines={1}>
                                    {visitorsData?.phone_number}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Body Copy Section */}
                    {visitorsData?.body_copy ? (
                        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
                            <RenderHTML
                                contentWidth={width - 32}
                                source={{ html: visitorsData.body_copy }}
                                baseStyle={{
                                    fontSize: 13,
                                    color: "#333333",
                                    lineHeight: 18,
                                    textAlign: "justify",
                                }}
                                tagsStyles={{ p: { textAlign: "justify", marginVertical: 4 } }}
                            />
                        </View>
                    ) : null}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        paddingBottom: 32,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
    },
    headerIcon: {
        width: 22,
        height: 22,
        marginRight: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000000",
    },
    carouselContainer: {
        width: CAROUSEL_WIDTH,
        height: 190,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#F0F0F0",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    carouselImage: {
        width: CAROUSEL_WIDTH,
        height: 190,
    },
    placeholderImage: {
        justifyContent: "center",
        alignItems: "center",
    },
    arrowButton: {
        position: "absolute",
        top: 75,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    ctaContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 20,
        gap: 12,
    },
    ctaCard: {
        flex: 1,
        height: 110,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E5EA",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },
    ctaImagePlaceholder: {
        flex: 3,
        backgroundColor: "#EFEFF4",
        justifyContent: "center",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    ctaContent: {
        flex: 2,
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    ctaTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#000000",
    },
    ctaSubtitle: {
        fontSize: 10,
        color: "#8E8E93",
        marginTop: 2,
    },
    bodyCopy: {
        fontSize: 13,
        color: "#333333",
        lineHeight: 18,
        marginHorizontal: 16,
        marginTop: 24,
        textAlign: "justify",
    },
});
