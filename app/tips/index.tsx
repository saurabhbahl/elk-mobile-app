import AppText from "@/components/AppText";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from 'react-native-render-html';

import CachedImage from "@/components/CachedImage";
import { useAppContent } from "@/contexts/AppContentContext";

const { width } = Dimensions.get("window");

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith("#") ? color : `#${color}`;
};

export default function TipsScreen() {
    const { brandData, tipsData, apiStatus, tipsScreenSettingsData } = useAppContent();
    const primaryColor = getValidColor(brandData?.brand_color_primary);
    const secondaryColor = getValidColor(brandData?.brand_color__secondary);

    const tips = tipsData || [];

    const renderTipItem = ({ item }: { item: any }) => {
        const imageUrl = item.tip_icon__image?.url;

        return (
            <View style={styles.tipCard}>
                <CachedImage
                    uri={imageUrl}
                    style={styles.tipImage}
                    contentFit="cover"
                />
                <View style={styles.tipContent}>
                    <View style={styles.titleRow}>
                        <AppText style={styles.tipTitle}>{item.tip_title || ""}</AppText>
                        {item.category__tag ? (
                            <View style={[styles.badge, primaryColor ? { backgroundColor: primaryColor + "15" } : null]}>
                                <AppText style={[styles.badgeText, primaryColor ? { color: primaryColor } : null]}>{item.category__tag}</AppText>
                            </View>
                        ) : null}
                    </View>

                    {item.tip_body ? (
                        <RenderHTML
                            contentWidth={width - 32}
                            source={{ html: item.tip_body }}
                            baseStyle={{
                                fontSize: 13,
                                color: "#666666",
                                lineHeight: 18,
                            }}
                            tagsStyles={{ p: { marginVertical: 4 } }}
                        />
                    ) : null}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            
            

            {tipsScreenSettingsData?.screen_title ? (
                <View style={styles.headerRow}>
                    <CachedImage
                        uri={tipsScreenSettingsData.header_icon.url}
                        style={styles.headerIcon}
                        contentFit="contain"
                    />
                    <AppText style={[styles.sectionTitle, { color: primaryColor }]}>
                        {tipsScreenSettingsData.screen_title}
                    </AppText>
                </View>
            ) : null}

            {tipsScreenSettingsData?.intro_paragraph ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <RenderHTML
                        contentWidth={width - 32}
                        source={{ html: tipsScreenSettingsData.intro_paragraph }}
                        baseStyle={{
                            fontSize: 14,
                            color: "#333",
                            lineHeight: 20,
                            textAlign: "center"
                        }}
                        tagsStyles={{ p: { textAlign: "center", marginVertical: 4 } }}
                    />
                </View>
            ) : null}

            {apiStatus === "fetching" ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={tips}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderTipItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <AppText style={styles.emptyText}>No viewing tips available at the moment.</AppText>
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
        paddingBottom: 16,
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
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    tipCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
    },
    tipImage: {
        width: "100%",
        height: 150,
        backgroundColor: "#F0F0F0",
    },
    tipContent: {
        padding: 16,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000000",
        flex: 1,
        marginRight: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    tipBody: {
        fontSize: 13,
        color: "#666666",
        lineHeight: 18,
    },
    emptyText: {
        textAlign: "center",
        color: "#666666",
        marginTop: 20,
        fontSize: 14,
    },
});
