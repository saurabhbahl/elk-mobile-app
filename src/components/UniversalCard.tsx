import { EventsData, ProgramsData } from '@/src/contexts/AppContentContext';
import { formatDateBadge } from '@/src/utils/dateUtils';
import { isValidData } from '@/src/utils/validation';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import AppText from './AppText';
import CachedImage from './CachedImage';
import SkeletonPlaceholder from './SkeletonPlaceholder';

type UniversalCardProps = {
    type: 'program' | 'event' | 'rental';
    item: ProgramsData | EventsData | any;
    variant: 'horizontal' | 'grid' | 'featured' | 'list';
    primaryColor: string;
    onPress?: () => void;
    hideBadge?: boolean;
};

export default function UniversalCard({ type, item, variant, primaryColor, onPress, hideBadge }: UniversalCardProps) {
    const { width: screenWidth } = useWindowDimensions();

    // Parse date for programs and events
    let badge: { month?: string; day?: string; text?: string } | null = null;

    if (item && type === 'program' && item.schedule_dates) {
        const parsedBadge = formatDateBadge(item.schedule_dates);
        if (parsedBadge) {
            badge = parsedBadge;
        } else {
            badge = { text: item.schedule_dates };
        }
    } else if (item && type === 'event' && item["start_date_&_time"]) {
        badge = formatDateBadge(item["start_date_&_time"]);
    }

    const title = item ? (type === 'program' ? item.program_name : type === 'rental' ? item.rental_name : item.event_name) : '';
    const subtitle = item ? (type === 'rental' ? item.rental_type : item.short_description) : '';

    let imageUrl = item?.thumbnail_image?.url as string;
    if (item && type === 'rental') {
        // specific to Rentals (we use featured_image for cards now)
        if (item.featured_image && typeof item.featured_image === 'object' && 'url' in item.featured_image) {
            imageUrl = (item.featured_image as any).url;
        } else if (item.featured_image?.url) {
            imageUrl = item.featured_image.url;
        }
    }

    const styles = React.useMemo(() => createStyles(primaryColor, variant, screenWidth), [primaryColor, variant, screenWidth]);

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            router.push(`/${type}s/${item.id}` as any);
        }
    };

    const isGrid = variant === 'grid';
    const isList = variant === 'list';
    const isHorizontal = variant === 'horizontal';
    const isFeatured = variant === 'featured';

    const getCardStyle = () => {
        if (isGrid) return styles.gridCard;
        if (isList) return styles.listCard;
        if (isHorizontal) return styles.horizontalCard;
        if (isFeatured) return styles.featuredCard;
        return styles.horizontalCard;
    };

    const [isImageLoading, setIsImageLoading] = React.useState(!!imageUrl);

    if (!item) return null;

    return (
        <TouchableOpacity style={getCardStyle()} activeOpacity={0.85} onPress={handlePress}>
            <View style={styles.imageContainer}>
                <CachedImage
                    uri={imageUrl}
                    style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                    contentFit="cover"
                    onLoadStateChange={setIsImageLoading}
                />
                {badge && !hideBadge && (
                    <View style={[styles.cardBadge, { backgroundColor: primaryColor }]}>
                        {badge.text ? (
                            <AppText style={styles.cardBadgeText} numberOfLines={2}>
                                {badge.text}
                            </AppText>
                        ) : (
                            <>
                                <AppText style={styles.cardBadgeMonth}>{badge.month}</AppText>
                                <AppText style={styles.cardBadgeDay}>{badge.day}</AppText>
                            </>
                        )}
                    </View>
                )}
            </View>

            <ImageBackground
                source={require('../../assets/images/topo.png')}
                style={styles.bottomSection}
                imageStyle={{ opacity: 1 }}
                contentFit="cover"
            >
                <View style={styles.textCol}>
                    {isValidData(title) && (
                        <AppText style={styles.cardName} numberOfLines={isGrid ? 2 : 1}>
                            {title}
                        </AppText>
                    )}
                    {isValidData(subtitle) && (
                        <AppText style={type === 'rental' ? [styles.cardName, { marginTop: 2 }] : styles.cardLocation} numberOfLines={1}>
                            {subtitle}
                        </AppText>
                    )}
                </View>

                {!isGrid && (
                    <View style={[styles.cardViewButton]}>
                        <AppText style={styles.cardViewButtonText}>View</AppText>
                    </View>
                )}
            </ImageBackground>

            {isImageLoading && (
                <SkeletonPlaceholder style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />
            )}
        </TouchableOpacity>
    );
}

const createStyles = (primaryColor: string, variant: string, width: number) => {
    const cardWidth = (width - 44) / 2;
    // Keep standard size for home screen cards (featured & horizontal) on iPad
    const isHomeCard = variant === 'featured' || variant === 'horizontal';
    const isScaleUp = width >= 600 && !isHomeCard;

    return StyleSheet.create({
        horizontalCard: {
            width: Math.min(286, width - 48),
            aspectRatio: 286 / 250,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: primaryColor,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
            flexDirection: 'column',
        },
        featuredCard: {
            width: width - 32,
            aspectRatio: 343 / 269.33,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: primaryColor,
            marginHorizontal: 16,
            marginBottom: 24,
            flexDirection: 'column',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },
        gridCard: {
            width: cardWidth,
            aspectRatio: 165.5 / 220,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: primaryColor,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
            flexDirection: 'column',
        },
        listCard: {
            width: "100%",
            aspectRatio: 343 / 269.33,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: primaryColor,
            marginBottom: 24,
            flexDirection: 'column',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },

        imageContainer: {
            flex: 1,
            width: '100%',
            position: 'relative',
        },
        bottomSection: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isScaleUp ? 24 : (width < 380 ? 12 : 16),
            paddingVertical: isScaleUp ? 26 : (width < 380 ? 14 : 20),
            justifyContent: 'space-between',
            backgroundColor: '#000000',
            overflow: 'hidden',
        },
        textCol: {
            flex: 1,
            paddingRight: 12,
            justifyContent: 'center',
        },
        cardName: {
            fontSize: isScaleUp ? 18 : (width < 390 ? 12 : 14),
            fontFamily: 'OpenSans-Bold',
            color: "#FFFFFF",
            textTransform: 'capitalize',
        },
        cardLocation: {
            fontSize: isScaleUp ? 14 : (width < 380 ? 10 : 12),
            fontWeight: '400',
            letterSpacing: 0,
            fontFamily: 'OpenSans-Regular',
            color: '#ffffff',
            marginTop: 2,
        },

        cardBadge: {
            position: 'absolute',
            top: 0,
            right: 0,
            paddingHorizontal: isScaleUp ? 14 : (width < 380 ? 8 : 10),
            paddingVertical: isScaleUp ? 12 : (width < 380 ? 6 : 8),
            borderBottomLeftRadius: isScaleUp ? 14 : 10,
            alignItems: 'center',
            zIndex: 5,
        },
        cardBadgeMonth: {
            fontSize: isScaleUp ? 14 : (width < 380 ? 8 : 10),
            fontFamily: 'OpenSans-Bold',
            color: '#FFFFFF',
            letterSpacing: 0.5,
            textAlign: 'center',
            textTransform: 'uppercase'
        },
        cardBadgeDay: {
            fontSize: isScaleUp ? 28 : (width < 380 ? 16 : 20),
            fontFamily: 'OpenSans-Bold',
            color: '#FFFFFF',
            marginTop: isScaleUp ? -4 : (width < 380 ? -2 : -4),
            textAlign: 'center',
        },
        cardBadgeText: {
            fontSize: isScaleUp ? 14 : (width < 380 ? 8 : 10),
            fontFamily: 'OpenSans-Bold',
            color: '#FFFFFF',
            letterSpacing: 0.3,
            textAlign: 'center',
            textTransform: 'uppercase',
            maxWidth: isScaleUp ? 110 : (width < 380 ? 56 : 70),
        },
        cardViewButton: {
            paddingHorizontal: isScaleUp ? 28 : 20,
            paddingVertical: isScaleUp ? 12 : 8,
            borderRadius: 20,
            shadowColor: '#ffffff',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 2,
            backgroundColor: '#ffffff'
        },
        cardViewButtonText: {
            fontSize: isScaleUp ? 16 : 12,
            fontFamily: 'OpenSans-Bold',
            color: '#000000',
        },
    });
};
