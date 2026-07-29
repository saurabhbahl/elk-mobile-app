import { Href } from "expo-router";
import AppText from "@/components/AppText";
import CachedImage from "@/components/CachedImage";
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

import { useAppContent } from "@/contexts/AppContentContext";
import { useTheme } from "@/context/ThemeContext";
import { LIGHT_COLORS, LIGHT_FONTS } from "@/constants/theme";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");
const cardWidth = (width - 44) / 2; // 16px padding on sides, 12px gap in middle

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramsScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { homeData, brandData, programsData, apiStatus, programsSettingData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const programs = programsData || [];
    
    // ACF select fields sometimes return an object { value: 'list', label: 'List' }
    const layoutValue = typeof programsSettingData?.layout === 'object' ? programsSettingData.layout.value : programsSettingData?.layout;
    const isGrid = (layoutValue || "").toLowerCase() !== "list";

    const renderProgramCard = ({ item, index }: { item: Record<string, unknown>; index: number }) => (
        <TouchableOpacity
            style={isGrid ? styles.programCard : styles.programListCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/programs/${item.id || index}` as Href<string>)}
        >
            <CachedImage
                uri={item.thumbnail_image?.url}
                style={isGrid ? styles.programCardImage : styles.programListCardImage}
                contentFit="cover"
            />
            <View style={isGrid ? styles.programCardContent : styles.programListCardContent}>
                <AppText style={isGrid ? styles.programCardName : styles.programListCardName} numberOfLines={2}>
                    {item.program_name || ""}
                </AppText>
                <AppText style={isGrid ? styles.programCardDate : styles.programListCardDate} numberOfLines={1}>
                    {item.schedule__dates || ""}
                </AppText>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            
            

            {programsSettingData?.screen_title ? (
                <View style={styles.headerRow}>
                    <Image source={require("../../assets/images/Primary.png")} style={styles.headerIcon} />
                    <AppText style={[styles.sectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
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
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        backgroundColor: colors.surface,
        shadowColor: colors.onSurface,
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
        color: colors.onSurface,
        lineHeight: 16,
    },

    programCardDate: {
        fontSize: 11,
        color: colors.onSurfaceVariant,
        marginTop: 4,
    },

    programListCard: {
        width: "100%",
        flexDirection: "row",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: "hidden",
        backgroundColor: colors.surface,
        marginBottom: 12,
        shadowColor: colors.onSurface,
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
        color: colors.onSurface,
        marginBottom: 6,
    },

    programListCardDate: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
    },

    emptyText: {
        textAlign: "center",
        color: colors.onSurfaceVariant,
        fontSize: 14,
        marginTop: 40,
    },
});
