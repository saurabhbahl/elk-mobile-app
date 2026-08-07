import AppText from "@/src/components/AppText";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { router, useLocalSearchParams } from "expo-router";
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
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { ProgramsData, useAppContent } from "@/src/contexts/AppContentContext";
import { normalizeHex } from "../../src/utils/colorUtils";
import { extractPoiId, navigateToPoi } from "../../src/utils/mapUtils";
import { isValidData } from "../../src/utils/validation";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, programsData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const program = programsData?.find(
        (p: ProgramsData, index: number) => String(p.id || index) === String(id)
    );

    const poiId = React.useMemo(() => extractPoiId(program?.location), [program?.location]);

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

    if (!program) {
        return (
            <SafeAreaView style={styles.container} edges={["left", "right"]}>
                <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />


                <View style={styles.errorContainer}>
                    <AppText style={styles.errorText}>Program not found.</AppText>
                    <TouchableOpacity
                        style={[styles.backTextButton, { backgroundColor: primaryColor }]}
                        onPress={() => router.back()}
                    >
                        <AppText style={styles.backTextButtonText}>Go Back</AppText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const rawDescription = program.full_description || "";

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right"]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />




            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Navbar />
                <QuickLinks />
                {/* Heading Row */}
                {isValidData(program.program_name) ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <SectionHeader
                            title={program.program_name as string}
                            iconSource={require("../../assets/images/programicon.png")}
                            primaryColor={primaryColor || "#000000"}
                            secondaryColor={secondaryColor || "#ea0b0b"}
                            isDark={isDark}
                            style={{ marginLeft: 0 }}
                        />
                    </View>
                ) : null}

                {/* Banner Image */}
                {isValidData(program.thumbnail_image) ? (
                    <View style={[styles.bannerContainer, { position: 'relative' }]}>
                        <CachedImage
                            uri={program.thumbnail_image?.url as string}
                            style={[styles.bannerImage, { aspectRatio: 4 / 3, height: undefined }]}
                            contentFit="cover"
                        />
                        {poiId !== null ? (
                            <View style={{ position: 'absolute', bottom: 12, right: 28, zIndex: 10 }}>
                                <PrimaryButton title="Get Directions" onPress={() => navigateToPoi(router, poiId)} />
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Details Section */}
                <View style={styles.detailsContent}>
                    {/* Schedule / Date & Time */}
                    {isValidData(program.schedule__dates) ? (
                        <AppText style={[styles.scheduleText, { fontFamily: 'OpenSans-Regular', fontSize: 13, lineHeight: 20, fontWeight: '400' }]}>
                            {program.schedule__dates}
                        </AppText>
                    ) : null}
                    {/* Short Description */}
                    <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 14, lineHeight: 14, fontWeight: '700', color: colors.onSurface, marginBottom: 12 }}>
                        {isValidData(program.short_description) ? program.short_description : "Elk Country Visitor Center"}
                    </AppText>

                    {/* Description Paragraph */}
                    {rawDescription ? (
                        <RenderHTML
                            contentWidth={width - 32} // paddingHorizontal is 16 on each side
                            source={{ html: typeof rawDescription === "string" ? rawDescription : "" }}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontSize: 13,
                                color: colors.onSurface,
                                lineHeight: 20,
                            }}
                            tagsStyles={{
                                p: { marginVertical: 8 }
                            }}
                        />
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

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
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

    bannerContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
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

    scheduleText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.onSurface,
        marginBottom: 14,
    },

    descriptionText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 22,
    },
});
