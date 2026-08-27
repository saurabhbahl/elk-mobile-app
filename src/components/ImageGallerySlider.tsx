import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { normalizeHex } from "@/src/utils/colorUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import CachedImage from "./CachedImage";

interface ImageGallerySliderProps {
    images: string[];
    width?: number;
    height?: number;
}

export default function ImageGallerySlider({ images, width: propWidth, height }: ImageGallerySliderProps) {
    const { colors } = useTheme();
    const { brandData } = useAppContentData();
    const { width: screenWidth } = useWindowDimensions();
    const brandPrimary = normalizeHex(brandData?.brand_color_primary) || colors.primary;
    const [activeIndex, setActiveIndex] = useState(0);
    const [layoutWidth, setLayoutWidth] = useState<number>(0);
    const flatListRef = useRef<FlatList>(null);

    // Effective slide width: measured layout container width -> fallback to propWidth -> fallback to screenWidth - 32
    const sliderWidth = layoutWidth > 0 ? layoutWidth : (propWidth || (screenWidth - 32));

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
        <View
            onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - layoutWidth) > 1) {
                    setLayoutWidth(w);
                }
            }}
            style={[
                styles.carouselContainer,
                {
                    width: "100%",
                    aspectRatio: 4 / 3,
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                },
            ]}
        >
            <FlatList
                ref={flatListRef}
                data={images}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, index) => ({
                    length: sliderWidth,
                    offset: sliderWidth * index,
                    index,
                })}
                onMomentumScrollEnd={(e) => {
                    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / sliderWidth);
                    setActiveIndex(nextIndex);
                }}
                renderItem={({ item }) => (
                    <CachedImage
                        uri={item}
                        style={{
                            width: sliderWidth,
                            aspectRatio: 4 / 3,
                            borderRadius: 12,
                            backgroundColor: "rgba(0,0,0,0.05)",
                        }}
                        contentFit="cover"
                    />
                )}
            />
            {showControls && (
                <>
                    <TouchableOpacity
                        style={[
                            styles.arrowButton,
                            { left: 10, top: "50%", marginTop: -16, backgroundColor: brandPrimary },
                            activeIndex === 0 ? { opacity: 0.4 } : { opacity: 1 },
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
                            { right: 10, top: "50%", marginTop: -16, backgroundColor: brandPrimary },
                            activeIndex === images.length - 1 ? { opacity: 0.4 } : { opacity: 1 },
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
