import {
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useNavigationMode } from "../../app/_layout";

// Minimum px in ONE finger gesture to trigger hide/show
const HIDE_GESTURE_DISTANCE = 15;
const SHOW_GESTURE_DISTANCE = 15;
// If content is shorter than this, never hide
const MIN_SCROLLABLE = 300;

export function useScrollDirection() {
    const { navbarVisibility } = useNavigationMode();

    // 0 = shown, 1 = hidden
    const targetState = useSharedValue<0 | 1>(0);

    // Captured at the START of each finger gesture — frozen for whole gesture
    const dragStartY = useSharedValue(-1);
    const dragStartMaxScroll = useSharedValue(-1);

    // Whether this gesture has already triggered a hide or show (one action per gesture)
    const gestureHandled = useSharedValue(false);

    // Edge flags: set at drag start to prevent changes at top/bottom
    const dragStartedAtBottom = useSharedValue(false);
    const dragStartedAtTop = useSharedValue(false);

    const hasScrolled = useSharedValue(false);

    // How close to the top or bottom (in px) to block navbar changes
    const EDGE_GUARD = 80;

    const scrollHandler = useAnimatedScrollHandler({
        onBeginDrag: (event) => {
            "worklet";
            const ms = event.contentSize.height - event.layoutMeasurement.height;
            const startY = event.contentOffset.y;

            // Freeze values at the moment finger touches down
            dragStartY.value = startY;
            dragStartMaxScroll.value = ms;
            gestureHandled.value = false;
            hasScrolled.value = true;

            // Set edge flags based on where the finger touched down
            const atBottom = ms > 0 && startY >= ms - EDGE_GUARD;
            const atTop = startY <= EDGE_GUARD;
            dragStartedAtBottom.value = atBottom;
            dragStartedAtTop.value = atTop;

            // If user touches near the top and navbar is already hidden, show it immediately
            if (atTop && (targetState.value !== 0 || navbarVisibility.value > 0)) {
                targetState.value = 0;
                gestureHandled.value = true;
                navbarVisibility.value = withTiming(0, { duration: 200 });
            }
        },

        onScroll: (event) => {
            "worklet";

            const currentY = event.contentOffset.y;
            const currentMaxScroll = event.contentSize.height - event.layoutMeasurement.height;

            // If dragStartY hasn't been set (onBeginDrag didn't fire — common on Android
            // for short content), handle the small-content case here directly.
            if (dragStartY.value < 0) {
                if (currentMaxScroll < MIN_SCROLLABLE && (targetState.value !== 0 || navbarVisibility.value > 0)) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, { duration: 200 });
                }
                return;
            }

            // Use the maxScroll captured at drag start (immune to layout changes from animations)
            const frozenMaxScroll = dragStartMaxScroll.value;

            // Content too short at gesture start → never allow hiding this gesture
            if (frozenMaxScroll < MIN_SCROLLABLE) {
                // If navbar is hidden from a previous page, show it
                if (targetState.value !== 0 || navbarVisibility.value > 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, { duration: 200 });
                }
                return;
            }

            // Always show when scrolled near the top (regardless of edge guard)
            if (currentY < EDGE_GUARD) {
                if (targetState.value !== 0 || navbarVisibility.value > 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, { duration: 200 });
                }
                return;
            }

            const gestureDistance = currentY - dragStartY.value;

            // Scrolled DOWN more than threshold → HIDE
            // Allow re-evaluation every scroll event (no gestureHandled gate) so fast flings work
            if (
                gestureDistance >= HIDE_GESTURE_DISTANCE &&
                !dragStartedAtTop.value &&
                targetState.value !== 1
            ) {
                targetState.value = 1;
                navbarVisibility.value = withTiming(1, { duration: 200 });
            }

            // Scrolled UP more than threshold → SHOW
            // Use gestureHandled here to prevent flicker on rubber-band bounce at bottom
            if (
                gestureDistance <= -SHOW_GESTURE_DISTANCE &&
                !gestureHandled.value &&
                !dragStartedAtBottom.value &&
                (targetState.value !== 0 || navbarVisibility.value > 0)
            ) {
                targetState.value = 0;
                gestureHandled.value = true;
                navbarVisibility.value = withTiming(0, { duration: 200 });
            }
        },

        onEndDrag: () => {
            "worklet";
            dragStartY.value = -1;
            dragStartMaxScroll.value = -1;
            gestureHandled.value = false;
            dragStartedAtBottom.value = false;
            dragStartedAtTop.value = false;
        },

        onMomentumEnd: () => {
            "worklet";
            dragStartY.value = -1;
            dragStartMaxScroll.value = -1;
            gestureHandled.value = false;
            dragStartedAtBottom.value = false;
            dragStartedAtTop.value = false;
        },
    });

    // ----------------------------------------------------------------
    // Touch fallback for non-scrollable screens
    // ----------------------------------------------------------------

    const touchStartY = useSharedValue(0);

    const handleTouchStart = (e: any) => {
        touchStartY.value = e.nativeEvent.pageY;
        hasScrolled.value = false;
    };

    const handleTouchEnd = (e: any) => {
        const deltaY = e.nativeEvent.pageY - touchStartY.value;

        // Finger moved DOWN on screen (deltaY > 0) = scroll-up gesture = show navbar
        // Only act if the scroll handler hasn't already handled this gesture
        if (deltaY > 20 && !hasScrolled.value && (targetState.value !== 0 || navbarVisibility.value > 0)) {
            targetState.value = 0;
            navbarVisibility.value = withTiming(0, { duration: 200 });
        }
    };

    return {
        scrollHandler,
        handleTouchStart,
        handleTouchEnd,
    };
}