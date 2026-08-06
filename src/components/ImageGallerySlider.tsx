import React, { useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import CachedImage from "./CachedImage";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { normalizeHex } from "@/src/utils/colorUtils";

interface ImageGallerySliderProps {
    images: string[];
    width: number;
    height: number;
}

export default function ImageGallerySlider({ images, width, height }: ImageGallerySliderProps) {
    const { colors } = useTheme();
    const { brandData } = useAppContentData();
    const brandPrimary = normalizeHex(brandData?.brand_color_primary) || colors.primary;
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handlePrevSlide = () => {
        if (activeIndex === 0 || images.length <= 1) return;
        const newIndex = activeIndex - 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    const handleNextSlide = () => {
        if (activeIndex === images.length - 1 || images.length <= 1) return;
        const newIndex = activeIndex + 1;
        setActiveIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    };

    if (!images || images.length === 0) return null;

    const showControls = images.length > 1;

    return (
        <View style={[styles.carouselContainer, { width, aspectRatio: 4 / 3, backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
            <FlatList
                ref={flatListRef}
                data={images}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActiveIndex(nextIndex);
                }}
                renderItem={({ item }) => (
                    <CachedImage
                        uri={item}
                        style={{ width, aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' }}
                        contentFit="contain"
                    />
                )}
            />
            {showControls && (
                <>
                    <TouchableOpacity
                        style={[
                            styles.arrowButton, 
                            { left: 10, top: (width * 3 / 4) / 2 - 16, backgroundColor: brandPrimary },
                            activeIndex === 0 ? { opacity: 0.4 } : { opacity: 1 }
                        ]}
                        onPress={handlePrevSlide}
                        activeOpacity={0.8}
                        disabled={activeIndex === 0}
                    >
                        <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.arrowButton, 
                            { right: 10, top: (width * 3 / 4) / 2 - 16, backgroundColor: brandPrimary },
                            activeIndex === images.length - 1 ? { opacity: 0.4 } : { opacity: 1 }
                        ]}
                        onPress={handleNextSlide}
                        activeOpacity={0.8}
                        disabled={activeIndex === images.length - 1}
                    >
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    carouselContainer: {
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        borderWidth: 1,
    },
    arrowButton: {
        position: "absolute",
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
});
