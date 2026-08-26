import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { normalizeHex } from "@/src/utils/colorUtils";
import { StyleSheet, TextStyle, TouchableOpacity, ViewStyle } from "react-native";
import AppText from "./AppText";

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function PrimaryButton({ title, onPress, style, textStyle }: PrimaryButtonProps) {
    const { fonts } = useTheme();
    const { brandData } = useAppContentData();

    const brandSecondary = normalizeHex(brandData?.brand_color_secondary);

    return (
        <TouchableOpacity
            style={[
                styles.button,
                brandSecondary ? { backgroundColor: brandSecondary } : {},
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <AppText
                style={[
                    styles.buttonText,
                    { fontFamily: fonts.bodyBold },
                    { color: '#ffffffff' },
                    textStyle
                ]}
            >
                {title}
            </AppText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 99,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.2,
    },
});
