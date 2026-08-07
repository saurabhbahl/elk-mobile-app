import { Platform } from "react-native";
import {
    Easing,
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useNavigationMode } from "../../app/_layout";

// Smooth 180ms cubic-bezier transition for all platforms to avoid flashing/harsh layout jumps.
const ANIM_DURATION = 500;
const ANIM_CONFIG = { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) };

// Android fires scroll events on the JS thread — throttle to 32ms (30fps) to
// reduce workload on low-end devices. iOS uses the native thread so 16ms is fine.
export const SCROLL_THROTTLE = Platform.OS === 'android' ? 32 : 16;

// Minimum px in ONE finger gesture to trigger hide/show
const HIDE_GESTURE_DISTANCE = 15;
const SHOW_GESTURE_DISTANCE = 15;
// If content is shorter than this, never hide the navbar
const MIN_SCROLLABLE = 300;
// How many px past the scroll boundary before we classify it as overscroll
const OVERSCROLL_BUFFER = 5;

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

    // KEY FIX: once a gesture enters rubber-band territory (overscroll), lock ALL
    // show/hide decisions for the rest of that gesture so the bounce-back doesn't
    // cause dancing. Resets when a new finger gesture begins.
    const overscrollLocked = useSharedValue(false);

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
            overscrollLocked.value = false; // reset lock for new gesture
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
                navbarVisibility.value = withTiming(0, ANIM_CONFIG);
            }
        },

        onScroll: (event) => {
            "worklet";

            const currentY = event.contentOffset.y;
            const currentMaxScroll = event.contentSize.height - event.layoutMeasurement.height;

            // Use the frozen max (captured before navbar animation changed layout).
            // Fall back to live value only when drag hasn't started yet.
            const frozenMax = dragStartMaxScroll.value;
            const maxForGuard = frozenMax > 0 ? frozenMax : currentMaxScroll;

            // Detect overscroll (rubber-banding). If currentY is outside the valid
            // scroll range by more than OVERSCROLL_BUFFER, lock this gesture.
            if (currentY < -OVERSCROLL_BUFFER || currentY > maxForGuard + OVERSCROLL_BUFFER) {
                overscrollLocked.value = true;
                return;
            }

            // Once locked, skip ALL hide/show logic until the next gesture starts.
            // This stops the snap-back animation from triggering a show/hide flicker.
            if (overscrollLocked.value) {
                return;
            }

            // If dragStartY hasn't been set (onBeginDrag didn't fire — common on Android
            // for short content), handle the small-content case here directly.
            if (dragStartY.value < 0) {
                if (currentMaxScroll < MIN_SCROLLABLE && (targetState.value !== 0 || navbarVisibility.value > 0)) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, ANIM_CONFIG);
                }
                return;
            }

            // Content too short at gesture start → never allow hiding this gesture
            if (frozenMax < MIN_SCROLLABLE) {
                // If navbar is hidden from a previous page, show it
                if (targetState.value !== 0 || navbarVisibility.value > 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, ANIM_CONFIG);
                }
                return;
            }

            // Always show when scrolled near the top (regardless of edge guard)
            if (currentY < EDGE_GUARD) {
                if (targetState.value !== 0 || navbarVisibility.value > 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, ANIM_CONFIG);
                }
                return;
            }

            const gestureDistance = currentY - dragStartY.value;

            // Scrolled DOWN more than threshold → HIDE
            if (
                gestureDistance >= HIDE_GESTURE_DISTANCE &&
                !dragStartedAtTop.value &&
                targetState.value !== 1
            ) {
                targetState.value = 1;
                navbarVisibility.value = withTiming(1, ANIM_CONFIG);
            }

            // Scrolled UP more than threshold → SHOW
            if (
                gestureDistance <= -SHOW_GESTURE_DISTANCE &&
                !gestureHandled.value &&
                !dragStartedAtBottom.value &&
                (targetState.value !== 0 || navbarVisibility.value > 0)
            ) {
                targetState.value = 0;
                gestureHandled.value = true;
                navbarVisibility.value = withTiming(0, ANIM_CONFIG);
            }
        },

        onEndDrag: () => {
            "worklet";
            dragStartY.value = -1;
            dragStartMaxScroll.value = -1;
            gestureHandled.value = false;
            overscrollLocked.value = false;
            dragStartedAtBottom.value = false;
            dragStartedAtTop.value = false;
        },

        onMomentumEnd: () => {
            "worklet";
            dragStartY.value = -1;
            dragStartMaxScroll.value = -1;
            gestureHandled.value = false;
            overscrollLocked.value = false;
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
            navbarVisibility.value = withTiming(0, ANIM_CONFIG);
        }
    };

    return {
        scrollHandler,
        handleTouchStart,
        handleTouchEnd,
    };
}