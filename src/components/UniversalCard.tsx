import { EventsData, ProgramsData } from '@/src/contexts/AppContentContext';
import { isValidData } from '@/src/utils/validation';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from './AppText';
import CachedImage from './CachedImage';

const { width } = Dimensions.get('window');
const cardWidth = (width - 44) / 2;

type UniversalCardProps = {
    type: 'program' | 'event' | 'rental';
    item: ProgramsData | EventsData | any;
    variant: 'horizontal' | 'grid' | 'featured' | 'list';
    primaryColor: string;
    onPress?: () => void;
};

export default function UniversalCard({ type, item, variant, primaryColor, onPress }: UniversalCardProps) {
    if (!item) return null;

    // Parse date for programs and events
    let badge = null;

    const parseDateStr = (dateStr: string) => {
        // Matches: 20 July 2026
        const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)/);
        // Matches: July 20, 2026
        const matchUS = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})/);

        if (match) {
            return {
                month: match[2].toUpperCase().slice(0, 3),
                day: match[1]
            };
        } else if (matchUS) {
            return {
                month: matchUS[1].toUpperCase().slice(0, 3),
                day: matchUS[2]
            };
        }

        // Fallback standard parsing
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
            const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            return { month: MONTHS[dateObj.getMonth()], day: dateObj.getDate().toString() };
        }
        return null;
    };

    const parseEventDateStr = (dateStr: string) => {
        // Matches: 17/07/2026 1:00 am
        const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            const day = match[1];
            const monthIndex = parseInt(match[2], 10) - 1;
            const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            if (monthIndex >= 0 && monthIndex < 12) {
                return { month: MONTHS[monthIndex], day: day };
            }
        }
        return null;
    };

    if (type === 'program' && item.schedule__dates) {
        badge = parseDateStr(item.schedule__dates);
    } else if (type === 'event' && item["start_date_&_time"]) {
        badge = parseEventDateStr(item["start_date_&_time"]);
    }

    const title = type === 'program' ? item.program_name : type === 'rental' ? item.rental_name : item.event_name;
    const subtitle = type === 'rental' ? item.rental_type : item.short_description;

    let imageUrl = item.thumbnail_image?.url as string;
    if (type === 'rental') {
        if (item.additional_images && Array.isArray(item.additional_images) && item.additional_images.length > 0) {
            imageUrl = item.additional_images[0]?.url;
        } else if (item.featured_image?.url) {
            imageUrl = item.featured_image.url;
        }
    }

    const styles = React.useMemo(() => createStyles(primaryColor), [primaryColor]);

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



    return (
        <TouchableOpacity style={getCardStyle()} activeOpacity={0.85} onPress={handlePress}>
            <View style={styles.imageContainer}>
                <CachedImage uri={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
                {badge && (
                    <View style={[styles.cardBadge, { backgroundColor: primaryColor }]}>
                        <AppText style={styles.cardBadgeMonth}>{badge.month}</AppText>
                        <AppText style={styles.cardBadgeDay}>{badge.day}</AppText>
                    </View>
                )}
            </View>

            <ImageBackground
                source={require('../../assets/images/vectors.png')}
                style={styles.bottomSection}
                imageStyle={{ opacity: 1, borderRadius: 10 }}
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
        </TouchableOpacity>
    );
}

const createStyles = (primaryColor: string) => StyleSheet.create({
    horizontalCard: {
        width: 286,
        height: 250,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: primaryColor,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'column',
    },
    featuredCard: {
        height: 269.33,
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    gridCard: {
        width: cardWidth,
        height: 220,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: primaryColor,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'column',
    },
    listCard: {
        width: "100%",
        height: 269.33,
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
        paddingHorizontal: 16,
        paddingVertical: 20,
        justifyContent: 'space-between',
        backgroundColor: primaryColor,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: -10
    },
    textCol: {
        flex: 1,
        paddingRight: 12,
        justifyContent: 'center',
    },
    cardName: {
        fontSize: width < 380 ? 12 : 14,
        fontFamily: 'OpenSans-Bold',
        color: "#FFFFFF",
    },
    cardLocation: {
        fontSize: width < 380 ? 10 : 12,
        fontWeight: 400,
        letterSpacing: 0,
        fontFamily: 'OpenSans-Regular',
        color: '#ffffff',
        marginTop: 2,
    },

    cardBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomLeftRadius: 10,
        alignItems: 'center',
        zIndex: 5,
    },
    cardBadgeMonth: {
        fontSize: 9,
        fontFamily: 'OpenSans-Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    cardBadgeDay: {
        fontSize: 20,
        fontFamily: 'OpenSans-Bold',
        color: '#FFFFFF',
        marginTop: -8,
        textAlign: 'center',
    },
    cardViewButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
        backgroundColor: '#ffffff'
    },
    cardViewButtonText: {
        fontSize: 11,
        fontFamily: 'OpenSans-Bold',
        color: '#000000',
    },
});
