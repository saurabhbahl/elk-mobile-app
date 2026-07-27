import AppText from "@/components/AppText";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navbar from "@/components/Navbar";
import QuickLinks from "@/components/QuickLinks";
import WireframePlaceholder from "@/components/WireframePlaceholder";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");
const cardWidth = (width - 44) / 2; // 16px padding on sides, 12px gap in middle

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramsScreen() {
    const { homeData, brandData, programsData, apiStatus, programsSettingData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const programs = programsData || [];
    
    // ACF select fields sometimes return an object { value: 'list', label: 'List' }
    const layoutValue = typeof programsSettingData?.layout === 'object' ? programsSettingData.layout.value : programsSettingData?.layout;
    const isGrid = (layoutValue || "").toLowerCase() !== "list";

    const renderProgramCard = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity
            style={isGrid ? styles.programCard : styles.programListCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/programs/${item.id || index}` as any)}
        >
            {item.thumbnail_image?.url ? (
                <Image
                    source={{ uri: item.thumbnail_image.url }}
                    style={isGrid ? styles.programCardImage : styles.programListCardImage}
                    contentFit="cover"
                />
            ) : (
                <WireframePlaceholder style={isGrid ? styles.programCardImage : styles.programListCardImage} />
            )}
            <View style={isGrid ? styles.programCardContent : styles.programListCardContent}>
                <AppText style={isGrid ? styles.programCardName : styles.programListCardName} numberOfLines={2}>
                    {item.program_name || "Program Name"}
                </AppText>
                <AppText style={isGrid ? styles.programCardDate : styles.programListCardDate} numberOfLines={1}>
                    {item.schedule__dates || "No Date"}
                </AppText>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Navbar />
            <View style={{ backgroundColor: primaryColor }}>
                <QuickLinks />
            </View>

            {programsSettingData?.screen_title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: primaryColor }]}>
                        {programsSettingData.screen_title}
                    </AppText>
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    key={isGrid ? "grid" : "list"}
                    data={programs}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderProgramCard}
                    numColumns={isGrid ? 2 : 1}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No programs available</AppText>
                    }
                />
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

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },

    backButton: {
        marginRight: 8,
        padding: 4,
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

    gridContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 12,
    },

    programCard: {
        width: cardWidth,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },

    programCardImage: {
        width: "100%",
        height: 110,
    },

    programCardContent: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: 64,
        justifyContent: "center",
    },

    programCardName: {
        fontSize: 13,
        fontWeight: "700",
        color: "#333333",
        lineHeight: 16,
    },

    programCardDate: {
        fontSize: 11,
        color: "#888888",
        marginTop: 4,
    },

    programListCard: {
        width: "100%",
        flexDirection: "row",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },

    programListCardImage: {
        width: 110,
        height: 110,
    },

    programListCardContent: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: "center",
    },

    programListCardName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333333",
        marginBottom: 6,
    },

    programListCardDate: {
        fontSize: 12,
        color: "#888888",
    },

    emptyText: {
        textAlign: "center",
        color: "#888888",
        fontSize: 14,
        marginTop: 40,
    },
});
