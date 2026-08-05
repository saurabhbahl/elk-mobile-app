import {
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useNavigationMode } from "../../app/_layout";

export function useScrollDirection() {
    const { navbarVisibility } = useNavigationMode();

    const lastScrollY = useSharedValue(0);
    const lastContentHeight = useSharedValue(0);
    const hasScrolled = useSharedValue(false);

    // 0 = shown, 1 = hidden
    const targetState = useSharedValue<0 | 1>(0);

    // 0 = scrolling up, 1 = scrolling down, -1 = initial
    const direction = useSharedValue<0 | 1 | -1>(-1);
    const directionStartY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            "worklet";

            hasScrolled.value = true;

            const currentY = event.contentOffset.y;
            const contentHeight = event.contentSize.height;
            const layoutHeight = event.layoutMeasurement.height;
            const maxScroll = contentHeight - layoutHeight;

            // We no longer block on lastContentHeight because targetState already prevents dancing


            // Ignore iOS rubber-band bounce
            if (currentY < 0 || (maxScroll > 0 && currentY > maxScroll)) {
                return;
            }

            // Always show navbar near the top
            if (currentY < 40) {
                if (targetState.value !== 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, {
                        duration: 180,
                    });
                }

                lastScrollY.value = currentY;
                direction.value = -1;
                return;
            }

            const diff = currentY - lastScrollY.value;

            lastScrollY.value = currentY;

            // Ignore tiny finger jitters
            if (Math.abs(diff) < 2) {
                return;
            }

            // -------------------------
            // Scrolling DOWN -> Hide
            // -------------------------
            if (diff > 0) {
                if (direction.value !== 1) {
                    direction.value = 1;
                    directionStartY.value = currentY;
                }

                if (
                    currentY - directionStartY.value >= 20 &&
                    targetState.value !== 1
                ) {
                    targetState.value = 1;

                    navbarVisibility.value = withTiming(1, {
                        duration: 180,
                    });
                }
            }

            // -------------------------
            // Scrolling UP -> Show
            // -------------------------
            else {
                if (direction.value !== 0) {
                    direction.value = 0;
                    directionStartY.value = currentY;
                }

                if (
                    directionStartY.value - currentY >= 20 &&
                    targetState.value !== 0
                ) {
                    targetState.value = 0;

                    navbarVisibility.value = withTiming(0, {
                        duration: 180,
                    });
                }
            }
        },
    });

    // ----------------------------------------------------------------
    // Touch fallback for screens that don't scroll
    // ----------------------------------------------------------------

    const touchStartY = useSharedValue(0);

    const handleTouchStart = (e: any) => {
        touchStartY.value = e.nativeEvent.pageY;
        hasScrolled.value = false;
    };

    const handleTouchEnd = (e: any) => {
        if (hasScrolled.value) return;

        const deltaY = e.nativeEvent.pageY - touchStartY.value;

        // Finger moved DOWN -> show navbar
        if (deltaY > 20) {
            if (targetState.value !== 0) {
                targetState.value = 0;

                navbarVisibility.value = withTiming(0, {
                    duration: 180,
                });
            }
        }

        // Finger moved UP -> hide navbar
        else if (deltaY < -20) {
            if (targetState.value !== 1) {
                targetState.value = 1;

                navbarVisibility.value = withTiming(1, {
                    duration: 180,
                });
            }
        }
    };

    return {
        scrollHandler,
        handleTouchStart,
        handleTouchEnd,
    };
}