import AppText from "@/src/components/AppText";
import ItemNotFoundScreen from "@/src/components/ItemNotFoundScreen";
import Navbar from "@/src/components/Navbar";
import QuickLinks from "@/src/components/QuickLinks";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    InteractionManager,
    Linking,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import CachedImage from "@/src/components/CachedImage";
import PrimaryButton from "@/src/components/PrimaryButton";
import SectionHeader from "@/src/components/SectionHeader";
import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { ProgramsData, useAppContent } from "@/src/contexts/AppContentContext";
import { formatProgramScheduleDate } from "@/src/utils/dateUtils";
import AppRenderHTML from "@/src/components/AppRenderHTML";
import { extractPoiId, navigateToPoi } from "../../src/utils/mapUtils";
import { isValidData } from "../../src/utils/validation";

import { parseLinkObject, handleLinkPress } from "@/src/utils/linkUtils";

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function ProgramDetailScreen() {
    const { colors, fonts, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { brandData, programsData, poisData, apiStatus } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color_secondary);

    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const program = programsData?.find(
        (p: ProgramsData, index: number) => String(p.id || index) === String(id)
    );

    const poiId = React.useMemo(() => extractPoiId(program?.location_poi_link || program?.location), [program?.location_poi_link, program?.location]);
    const relatedPoi = React.useMemo(() => {
        if (poiId === null || !poisData) return null;
        return poisData.find(p => String(p.id) === String(poiId)) || null;
    }, [poiId, poisData]);

    const poiName = relatedPoi?.poi_name || relatedPoi?.title || null;
    const poiAddress = relatedPoi?.address || null;

    const regLinkObj = React.useMemo(() => {
        return parseLinkObject(program?.registration_link, "More Info");
    }, [program?.registration_link]);

    const handleRegistrationPress = React.useCallback(() => {
        if (regLinkObj?.url) {
            handleLinkPress(regLinkObj.url, router);
        }
    }, [regLinkObj]);

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
            <ItemNotFoundScreen
                title="Program Not Found"
                message="This program is no longer available or may have been deleted."
            />
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
                                title={program.program_name as string}
                                iconSource={require("../../assets/images/programicon.png")}
                                primaryColor={primaryColor || "#000000"}
                                secondaryColor={secondaryColor || "#ea0b0b"}
                                isDark={isDark}
                                style={{ marginLeft: 0, flex: 1 }}
                            />
                        </View>
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
                    {isValidData(program.schedule_dates) ? (
                        <AppText style={[styles.scheduleText, { fontFamily: 'OpenSans-Regular', fontSize: 13, lineHeight: 20, fontWeight: '400' }]}>
                            {formatProgramScheduleDate(program.schedule_dates)}
                        </AppText>
                    ) : null}

                    {/* Short Description */}
                    {isValidData(program.short_description) ? (
                        <AppText style={{ fontFamily: 'OpenSans-Bold', fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
                            {program.short_description}
                        </AppText>
                    ) : null}

                    {/* Location */}
                    {(isValidData(poiName) || isValidData(poiAddress)) ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color="#555" style={styles.infoIcon} />
                            <View style={{ flex: 1 }}>
                                {isValidData(poiName) ? (
                                    <AppText style={styles.locationNameText}>{poiName}</AppText>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {/* Description Paragraph */}
                    {isValidData(rawDescription) ? (
                        <AppRenderHTML
                            html={typeof rawDescription === "string" ? rawDescription : ""}
                            contentWidth={width - 32}
                            baseStyle={{
                                fontFamily: 'OpenSans-Regular',
                                fontSize: 13,
                                color: colors.onSurface,
                                lineHeight: 20,
                                textAlign: "left",
                            }}
                        />
                    ) : null}

                    {/* Registration Link Button */}
                    {regLinkObj ? (
                        <View style={{ marginTop: 20, marginBottom: 16, alignItems: 'flex-start' }}>
                            <PrimaryButton
                                title={regLinkObj.title}
                                onPress={handleRegistrationPress}
                            />
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

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

    infoIcon: {
        marginRight: 8,
    },

    locationNameText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.onSurface,
    },

    locationAddressText: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        marginTop: 2,
    },

    descriptionText: {
        fontSize: 14,
        color: colors.onSurface,
        lineHeight: 22,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    backIconButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
