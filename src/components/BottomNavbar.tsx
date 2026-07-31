import { useTheme } from '@/src/context/ThemeContext';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '@/src/constants/theme';

const isSmallDevice = SCREEN_HEIGHT < 700;
const isMediumDevice = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;
const NAV_HEIGHT = isSmallDevice ? 56 : isMediumDevice ? 64 : 70;

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function BottomNavbar() {
    const { brandData } = useAppContent();
    const { colors, isDark } = useTheme();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#8B1E1E";
    const secondaryColor = getValidColor(brandData?.brand_color__secondary) || "#FFFFFF";

    // Navigation items
    const navItems = [
        {
            name: 'Home',
            route: '/(home)',
            icon: require('../../assets/images/house.png'),
        },
        {
            name: 'Map',
            route: '/map',
            icon: require('../../assets/images/map.png'),
        },
        {
            name: 'Events',
            route: '/events',
            icon: require('../../assets/images/eventicon.png'),
        },
        {
            name: 'Tips',
            route: '/tips',
            icon: require('../../assets/images/tipsicon.png'),
        },
    ];

    const handleNavigation = (route: string) => {
        // Prevent navigating to the same active route
        const isActive = pathname === route ||
            (route === '/(home)' && (pathname === '/' || pathname === '/(home)')) ||
            (pathname.startsWith(route) && route !== '/(home)');

        if (isActive) return;

        if (route === '/(home)') {
            router.replace('/(home)');
        } else {
            router.replace(route as any);
        }
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: '#0F0F0F', // Solid dark premium background matching wireframe
                paddingBottom: Math.max(insets.bottom, isSmallDevice ? 6 : 10),
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
            }
        ]}>
            <View style={styles.navRow}>
                {navItems.map((item, index) => {
                    const isActive = pathname === item.route ||
                        (item.route === '/(home)' && (pathname === '/' || pathname === '/(home)')) ||
                        (pathname.startsWith(item.route) && item.route !== '/(home)');

                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.navTab}
                            activeOpacity={0.7}
                            onPress={() => handleNavigation(item.route)}
                        >
                            <Image
                                source={item.icon}
                                style={[styles.navIcon, { tintColor: isActive ? secondaryColor : '#8E8E93' }]}
                                contentFit="contain"
                            />
                            <AppText style={[
                                styles.label,
                                { color: isActive ? secondaryColor : '#8E8E93', fontWeight: isActive ? '700' : '500' }
                            ]}>
                                {item.name}
                            </AppText>
                            {isActive && (
                                <View style={[styles.activeIndicator, { backgroundColor: primaryColor }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingTop: isSmallDevice ? 6 : 10,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
    },
    navTab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: NAV_HEIGHT,
        position: 'relative',
    },
    icon: {
        marginBottom: isSmallDevice ? 1 : 3,
    },
    navIcon: {
        width: 22,
        height: 22,
        marginBottom: isSmallDevice ? 1 : 3,
    },
    label: {
        fontSize: isSmallDevice ? 9 : 10,
        letterSpacing: 0.2,
    },
    activeIndicator: {
        position: 'absolute',
        top: -10,
        width: 24,
        height: 3,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    }
});
