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
            if (atTop && targetState.value !== 0) {
                targetState.value = 0;
                gestureHandled.value = true;
                navbarVisibility.value = withTiming(0, { duration: 200 });
            }
        },

        onScroll: (event) => {
            "worklet";

            const currentY = event.contentOffset.y;

            // If dragStartY hasn't been set (momentum scroll with no new drag), skip
            if (dragStartY.value < 0) {
                return;
            }

            // Already acted once this gesture — don't act again until next touch
            if (gestureHandled.value) {
                return;
            }

            // Use the maxScroll captured at drag start (immune to layout changes from animations)
            const frozenMaxScroll = dragStartMaxScroll.value;
            // Content too short at gesture start → never allow hiding this gesture
            if (frozenMaxScroll < MIN_SCROLLABLE) {
                // If navbar is hidden from a previous page, show it
                if (targetState.value !== 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, { duration: 200 });
                }
                return;
            }

            // Always show when scrolled near the top (regardless of edge guard)
            if (currentY < EDGE_GUARD) {
                if (targetState.value !== 0) {
                    targetState.value = 0;
                    navbarVisibility.value = withTiming(0, { duration: 200 });
                }
                return;
            }

            const gestureDistance = currentY - dragStartY.value;

            // Bottom edge: block BOTH hide and show (rubber-band protection)
            if (dragStartedAtBottom.value) {
                return;
            }

            // Scrolled DOWN more than threshold in this gesture → HIDE
            // Top edge: block hiding only (user may still scroll up to show)
            if (
                gestureDistance >= HIDE_GESTURE_DISTANCE &&
                !dragStartedAtTop.value &&
                targetState.value !== 1
            ) {
                targetState.value = 1;
                gestureHandled.value = true;
                navbarVisibility.value = withTiming(1, { duration: 200 });
            }

            // Scrolled UP more than threshold in this gesture → SHOW
            // Always allowed (even from top edge) so navbar can reappear
            if (gestureDistance <= -SHOW_GESTURE_DISTANCE && targetState.value !== 0) {
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
        if (hasScrolled.value) return;

        const deltaY = e.nativeEvent.pageY - touchStartY.value;

        // Finger moved DOWN → show navbar
        if (deltaY > 20) {
            if (targetState.value !== 0) {
                targetState.value = 0;
                navbarVisibility.value = withTiming(0, { duration: 200 });
            }
        }
    };

    return {
        scrollHandler,
        handleTouchStart,
        handleTouchEnd,
    };
}