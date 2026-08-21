import { LIGHT_COLORS, LIGHT_FONTS, width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContent } from "@/src/contexts/AppContentContext";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const scale = width / 600;
const r = (size: number) => Math.min(size * scale, size * 1.5);

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function Navbar() {
    const { colors, fonts, isDark } = useTheme();
    const { brandData } = useAppContent();
    const insets = useSafeAreaInsets();
    const styles = React.useMemo(() => createStyles(colors, fonts, isDark), [colors, fonts, isDark]);

    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#000000";

    const logoPrimaryUri = typeof brandData?.logo_primary === 'string' 
        ? brandData.logo_primary 
        : (brandData?.logo_primary as any)?.url;

    const logoSecondaryUri = typeof brandData?.logo_secondary === 'string' 
        ? brandData.logo_secondary 
        : (brandData?.logo_secondary as any)?.url;

    const logoPrimarySource = React.useMemo(() => {
        return logoPrimaryUri ? { uri: logoPrimaryUri } : null;
    }, [logoPrimaryUri]);

    const logoSecondarySource = React.useMemo(() => {
        return logoSecondaryUri ? { uri: logoSecondaryUri } : null;
    }, [logoSecondaryUri]);

    return (
        <View style={[
            styles.header,
            { paddingTop: insets.top, paddingBottom: r(5) },
            primaryColor ? { backgroundColor: primaryColor } : {},
            {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            }
        ]}>
            <View style={styles.leftActions}>
                <TouchableOpacity
                    onPress={() => router.navigate("/(home)")}
                    activeOpacity={0.8}
                >
                    {logoPrimarySource ? (
                        <Image
                            source={logoPrimarySource}
                            style={styles.headerLogo}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={0}
                        />
                    ) : null}
                </TouchableOpacity>
            </View>

            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end', pointerEvents: 'none', marginLeft: r(55), marginTop: 170 }]}>
                {logoSecondarySource ? (
                    <Image
                        source={logoSecondarySource}
                        style={styles.headerExplorer}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={0}
                    />
                ) : null}
            </View>
        </View>
    );
}

const createStyles = (colors: typeof LIGHT_COLORS, fonts: typeof LIGHT_FONTS, isDark: boolean) => StyleSheet.create({
    header: {
        minHeight: r(120),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: r(16),
        borderBottomWidth: 1,
    },

    headerLogo: {
        height: r(150),
        width: r(150),
    },

    headerExplorer: {
        height: r(200),
        width: r(200),
    },

    leftActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginLeft: r(8),
    },

    rightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    tipsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },

    tipsCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
    },

    tipsBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 6,
        marginTop: -5,
        zIndex: 5,
    },

    tipsBadgeText: {
        fontSize: 7,
        fontWeight: "900",
    },
});
