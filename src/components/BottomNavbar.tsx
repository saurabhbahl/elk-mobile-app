import { SCREEN_HEIGHT } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContentData } from '@/src/contexts/AppContentContext';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationMode } from '../../app/_layout';
import AppText from './AppText';

const isSmallDevice = SCREEN_HEIGHT < 700;
const isMediumDevice = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;
const NAV_HEIGHT = isSmallDevice ? 56 : isMediumDevice ? 64 : 70;

const getValidColor = (color: string | undefined) => {
    if (!color) return undefined;
    return color.startsWith('#') ? color : `#${color}`;
};

export default function BottomNavbar() {
    const { brandData } = useAppContentData();
    const { colors, isDark } = useTheme();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { isBottomNavbarHidden } = useNavigationMode();

    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withTiming(isBottomNavbarHidden ? 150 : 0, { duration: 250 });
    }, [isBottomNavbarHidden]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const isMapScreen = pathname === '/map' || pathname.startsWith('/map/');

    const primaryColor = getValidColor(brandData?.brand_color_primary) || "#000000";
    const secondaryColor = getValidColor(brandData?.brand_color__secondary) || "#ea0b0b";

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

        requestAnimationFrame(() => {
            if (route === '/(home)') {
                router.replace('/(home)');
            } else {
                router.replace(route as any);
            }
        });
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor: primaryColor, // Solid dark premium background matching wireframe
                paddingBottom: Math.max(insets.bottom, isSmallDevice ? 6 : 10),
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
            },
            isMapScreen && { position: 'absolute', bottom: 0, left: 0, right: 0 },
            animatedStyle
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
                                style={[styles.navIcon, { tintColor: isActive ? '#ffffff' : '#ffffff' }]}
                                contentFit="contain"
                            />
                            <AppText style={[
                                styles.label,
                                { color: isActive ? '#ffffff' : '#ffffff', fontWeight: isActive ? '700' : '500' }
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
        </Animated.View>
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
        zIndex: 9999,
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
        fontFamily: 'Roboto-Medium',
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
