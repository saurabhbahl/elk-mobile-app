import { Image } from 'expo-image';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from './AppText';

const { width } = Dimensions.get('window');

type SectionHeaderProps = {
    title: string;
    iconSource: any;
    primaryColor: string;
    secondaryColor: string;
    isDark: boolean;
    onPress?: () => void;
    isFeatured?: boolean;
    actionLabel?: string;
    onActionPress?: () => void;
    style?: any;
};

export default function SectionHeader({
    title,
    iconSource,
    primaryColor,
    secondaryColor,
    isDark,
    onPress,
    isFeatured,
    actionLabel,
    onActionPress,
    style
}: SectionHeaderProps) {

    const TitleComponent = onPress ? TouchableOpacity : View;

    if (isFeatured) {
        return (
            <View style={[styles.featuredEventHeaderRow, style]}>
                <View style={styles.featuredTitleContainer}>
                    <View style={[styles.sectionIconCircle, { backgroundColor: secondaryColor || "#ea0b0b" }]}>
                        <Image source={iconSource} style={styles.sectionIconImgLg} contentFit="contain" />
                    </View>
                    <TitleComponent onPress={onPress} style={styles.titleWrapper}>
                        <AppText style={[styles.featuredSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                            {title}
                        </AppText>
                    </TitleComponent>
                </View>
                {/* {actionLabel && onActionPress && (
                    <TouchableOpacity onPress={onActionPress}>
                        <AppText style={[styles.viewAllEventsText, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                            {actionLabel}
                        </AppText>
                    </TouchableOpacity>
                )} */}
            </View>
        );
    }

    return (
        <View style={[styles.subSectionTitleRow, style]}>
            <View style={[styles.sectionIconCircle, { backgroundColor: secondaryColor || "#ea0b0b" }]}>
                <Image source={iconSource} style={styles.sectionIconImg} contentFit="contain" />
            </View>
            <TitleComponent onPress={onPress} style={styles.titleWrapper}>
                <AppText style={[styles.subSectionTitle, { color: isDark ? "#FFFFFF" : primaryColor }]}>
                    {title}
                </AppText>
            </TitleComponent>
        </View>
    );
}

const styles = StyleSheet.create({
    subSectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginVertical: 8,
        gap: 6,
        flex: 1,
        flexShrink: 1,
    },
    titleWrapper: {
        flex: 1,
        flexShrink: 1,
    },
    subSectionTitle: {
        fontSize: width < 380 ? 16 : 18,
        fontFamily: 'Roboto-Medium',
        flexShrink: 1,
    },
    sectionIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sectionIconImg: {
        width: 16,
        height: 16,
    },
    sectionIconImgLg: {
        width: 20,
        height: 20,
    },
    featuredEventHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 10,
        flex: 1,
        flexShrink: 1,
    },
    featuredTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
        flexShrink: 1,
    },
    featuredSectionTitle: {
        fontSize: width < 380 ? 16 : 18,
        fontFamily: 'Roboto-Medium',
        flexShrink: 1,
    },
    viewAllEventsText: {
        fontSize: 12,
        fontFamily: 'Roboto-Regular',
        textDecorationLine: "underline",
    },
});
