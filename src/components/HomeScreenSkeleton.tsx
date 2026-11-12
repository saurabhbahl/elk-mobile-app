import React from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import SkeletonPlaceholder from "./SkeletonPlaceholder";

const MENU_PADDING = 16;
const MENU_GAP = 12;
const MAX_CARD_WIDTH = 175;
const DEFAULT_CARD_WIDTH = 166.67;
const DEFAULT_IMAGE_HEIGHT = 88;
const IMAGE_ASPECT_RATIO = DEFAULT_CARD_WIDTH / DEFAULT_IMAGE_HEIGHT;

export default function HomeScreenSkeleton() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const isSmallScreen = screenWidth < 380;
  const isWiderScreen = screenWidth >= 600;

  // Scale factor matching Navbar.tsx
  const scale = screenWidth / (isSmallScreen ? 660 : 600);
  const r = (size: number) => Math.min(size * scale, size * 1.3);

  // QuickLinks card width calculation matching QuickLinks.tsx
  const visibleCards = isWiderScreen ? 4.2 : isSmallScreen ? 2.4 : 2.1;
  const gapCount = isWiderScreen ? 4 : 2;
  const calculatedWidth =
    (screenWidth - MENU_PADDING - gapCount * MENU_GAP) / visibleCards;
  const quickLinkCardWidth = isWiderScreen
    ? Math.max(120, calculatedWidth)
    : Math.min(
        MAX_CARD_WIDTH,
        Math.max(isSmallScreen ? 100 : 120, calculatedWidth),
      );
  const quickLinkImageHeight = Math.round(
    quickLinkCardWidth / IMAGE_ASPECT_RATIO,
  );

  const cardBg = isDark ? "#17181A" : "#FFFFFF";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0F0F0F" : colors.surface },
      ]}
    >
      {/* Top Navbar Skeleton matching Navbar */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top,
            paddingBottom: r(5),
            backgroundColor: isDark ? "#000000" : "#FFFFFF",
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <View style={styles.navbarInner}>
          {/* Primary Logo (KECA) Skeleton */}
          <View
            style={[
              styles.navPrimaryLogo,
              { width: r(90), height: r(44), borderRadius: 8 },
            ]}
          >
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>

          {/* Secondary Logo (ElkXplorer) Skeleton in center */}
          <View style={styles.navCenterExplorer}>
            <View
              style={[
                styles.navSecondaryLogo,
                { width: r(130), height: r(28), borderRadius: 6 },
              ]}
            >
              <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
      >
        {/* QuickLinks Carousel Skeleton */}
        <View style={styles.quickLinksContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickLinksScroll}
            scrollEnabled={false}
          >
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.quickLinkCard,
                  {
                    width: quickLinkCardWidth,
                    backgroundColor: cardBg,
                    borderColor,
                  },
                ]}
              >
                <View
                  style={{
                    height: quickLinkImageHeight,
                    overflow: "hidden",
                  }}
                >
                  <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
                </View>
                <View style={styles.quickLinkTitleBox}>
                  <View style={styles.quickLinkTitleLine}>
                    <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Welcome Heading Skeleton */}
        <View style={styles.welcomeTitleSkeleton}>
          <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
        </View>

        {/* Welcome Banner Card Skeleton */}
        <View
          style={[
            styles.welcomeBannerCard,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <SkeletonPlaceholder style={StyleSheet.absoluteFill} />

          {/* Pill Badge at Top-Right */}
          <View style={styles.bannerBadgePlaceholder}>
            <SkeletonPlaceholder
              style={StyleSheet.absoluteFill}
              backgroundColor={isDark ? "rgba(255,255,255,0.18)" : "#CCCCCC"}
            />
          </View>

          {/* Intro Text Overlay at Bottom-Left */}
          <View style={styles.bannerTextContainer}>
            <View style={styles.bannerTextLine1}>
              <SkeletonPlaceholder
                style={StyleSheet.absoluteFill}
                backgroundColor={isDark ? "rgba(255,255,255,0.22)" : "#C0C0C0"}
              />
            </View>
            <View style={styles.bannerTextLine2}>
              <SkeletonPlaceholder
                style={StyleSheet.absoluteFill}
                backgroundColor={isDark ? "rgba(255,255,255,0.22)" : "#C0C0C0"}
              />
            </View>
          </View>
        </View>

        {/* Elk Viewing & Scenic Map Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconCircle}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[styles.sectionTitleLine, { width: 175 }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
        </View>

        {/* Map Card Skeleton */}
        <View
          style={[
            styles.mapCardSkeleton,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <SkeletonPlaceholder style={StyleSheet.absoluteFill} />

          {/* View Map Button Skeleton at Bottom-Right */}
          <View style={styles.mapButtonPlaceholder}>
            <SkeletonPlaceholder
              style={StyleSheet.absoluteFill}
              backgroundColor={isDark ? "rgba(255,255,255,0.22)" : "#C0C0C0"}
            />
          </View>
        </View>

        {/* Weekend Programs Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconCircle}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[styles.sectionTitleLine, { width: 150 }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
        </View>

        {/* Horizontal Programs Cards Skeleton */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.programsHorizontalList}
          scrollEnabled={false}
        >
          {[0, 1].map((index) => (
            <View
              key={index}
              style={[
                styles.programCard,
                {
                  width: Math.min(286, screenWidth - 48),
                  backgroundColor: cardBg,
                  borderColor,
                },
              ]}
            >
              <View style={styles.programCardImage}>
                <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
              </View>
              <View style={styles.programCardBottom}>
                <View style={styles.programTitleLine}>
                  <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
                </View>
                <View style={styles.programSubtitleLine}>
                  <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    borderBottomWidth: 1,
    zIndex: 10,
  },
  navbarInner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    position: "relative",
  },
  navPrimaryLogo: {
    overflow: "hidden",
  },
  navCenterExplorer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  navSecondaryLogo: {
    overflow: "hidden",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  quickLinksContainer: {
    paddingVertical: 12,
  },
  quickLinksScroll: {
    paddingHorizontal: MENU_PADDING,
    gap: MENU_GAP,
    flexDirection: "row",
  },
  quickLinkCard: {
    borderTopLeftRadius: 12.37,
    borderTopRightRadius: 12.37,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  quickLinkTitleBox: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  quickLinkTitleLine: {
    width: "70%",
    height: 11,
    borderRadius: 4,
    overflow: "hidden",
  },
  welcomeTitleSkeleton: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    width: "60%",
    height: 22,
    borderRadius: 6,
    overflow: "hidden",
  },
  welcomeBannerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    aspectRatio: 36 / 25,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  bannerBadgePlaceholder: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 88,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerTextContainer: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    gap: 6,
  },
  bannerTextLine1: {
    width: "75%",
    height: 14,
    borderRadius: 4,
    overflow: "hidden",
  },
  bannerTextLine2: {
    width: "50%",
    height: 14,
    borderRadius: 4,
    overflow: "hidden",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    gap: 8,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionTitleLine: {
    height: 18,
    borderRadius: 6,
    overflow: "hidden",
  },
  mapCardSkeleton: {
    marginHorizontal: 16,
    marginBottom: 20,
    aspectRatio: 343 / 250,
    borderRadius: 10.69,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  mapButtonPlaceholder: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 88,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  programsHorizontalList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
    flexDirection: "row",
  },
  programCard: {
    aspectRatio: 286 / 250,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  programCardImage: {
    width: "100%",
    flex: 1,
  },
  programCardBottom: {
    width: "100%",
    height: 70,
    padding: 10,
    justifyContent: "center",
    gap: 6,
  },
  programTitleLine: {
    width: "75%",
    height: 13,
    borderRadius: 4,
    overflow: "hidden",
  },
  programSubtitleLine: {
    width: "45%",
    height: 11,
    borderRadius: 4,
    overflow: "hidden",
  },
});
