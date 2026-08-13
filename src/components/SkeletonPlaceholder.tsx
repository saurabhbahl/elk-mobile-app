import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Dimensions, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

interface SkeletonPlaceholderProps {
    style?: StyleProp<ViewStyle>;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SkeletonPlaceholder({ style }: SkeletonPlaceholderProps) {
    const progress = useSharedValue(0);

    useEffect(() => {
        // Continuous loop from 0 to 1
        progress.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            false // don't reverse, just start from 0 again
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            progress.value,
            [0, 1],
            [-SCREEN_WIDTH, SCREEN_WIDTH]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View style={[styles.container, style]}>
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    colors={["transparent", "rgba(255, 255, 255, 0.6)", "transparent"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#E5E5E5",
        overflow: "hidden",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 0,
    }
});
