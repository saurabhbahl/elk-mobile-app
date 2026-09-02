import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/src/components/AppText';
import Navbar from '@/src/components/Navbar';
import SkeletonPlaceholder from '@/src/components/SkeletonPlaceholder';
import { LIGHT_COLORS, LIGHT_FONTS } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useAppContentData } from '@/src/contexts/AppContentContext';

const getValidColor = (color: string | undefined) => {
  if (!color) return undefined;
  return color.startsWith('#') ? color : `#${color}`;
};

// JavaScript injected to keep links and window.open inside the same in-app WebView
const INJECTED_LINK_HANDLER_JS = `
  (function() {
    function convertBlankLinks() {
      try {
        var links = document.getElementsByTagName('a');
        for (var i = 0; i < links.length; i++) {
          if (links[i].getAttribute('target') === '_blank') {
            links[i].setAttribute('target', '_self');
          }
        }
      } catch (e) {}
    }
    convertBlankLinks();
    if (window.MutationObserver) {
      var observer = new MutationObserver(function() {
        convertBlankLinks();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    window.addEventListener('DOMContentLoaded', convertBlankLinks);
    window.addEventListener('load', convertBlankLinks);
    window.open = function(openUrl) {
      if (openUrl) {
        window.location.href = openUrl;
      }
      return null;
    };
  })();
  true;
`;

/**
 * Rich in-app skeleton placeholder representing a loaded webpage structure.
 */
function WebViewSkeleton({ isDark }: { isDark: boolean }) {
  const bgPlaceholder = isDark ? '#232323' : '#EAEAEA';

  return (
    <View style={[stylesSkeleton.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={stylesSkeleton.scrollContent}
        scrollEnabled={false}
      >
        {/* Hero Media Banner Skeleton */}
        <View style={[stylesSkeleton.heroBanner, { backgroundColor: bgPlaceholder }]}>
          <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
        </View>

        {/* Content Body */}
        <View style={stylesSkeleton.body}>
          {/* Main Title Bar */}
          <View style={[stylesSkeleton.titleLine, { backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>

          {/* Subtitle / Metadata */}
          <View style={[stylesSkeleton.subtitleLine, { backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>

          {/* Divider */}
          <View style={[stylesSkeleton.divider, { backgroundColor: isDark ? '#222222' : '#F0F0F0' }]} />

          {/* First Paragraph Block */}
          <View style={[stylesSkeleton.textLine, { width: '100%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[stylesSkeleton.textLine, { width: '92%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[stylesSkeleton.textLine, { width: '85%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[stylesSkeleton.textLine, { width: '60%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>

          {/* Embedded Media / Card Box */}
          <View style={[stylesSkeleton.cardBox, { backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>

          {/* Second Paragraph Block */}
          <View style={[stylesSkeleton.textLine, { width: '96%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[stylesSkeleton.textLine, { width: '88%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
          <View style={[stylesSkeleton.textLine, { width: '70%', backgroundColor: bgPlaceholder }]}>
            <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function InAppBrowserScreen() {
  const { url } = useLocalSearchParams<{ url: string; title?: string }>();
  const { colors, fonts, isDark } = useTheme();
  const { brandData } = useAppContentData();

  const primaryColor = getValidColor(brandData?.brand_color_primary) || '#000000';
  const secondaryColor = getValidColor(brandData?.brand_color_secondary) || '#ea0b0b';

  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const styles = useMemo(
    () => createStyles(colors, fonts, isDark, primaryColor, secondaryColor),
    [colors, fonts, isDark, primaryColor, secondaryColor]
  );

  // Hardware Back Button: navigate back within WebView history first
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setIsLoading(navState.loading);
  };

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />

      {/* Top Brand Navbar */}
      <Navbar />

      {/* Loading Progress Bar */}
      {isLoading && loadProgress > 0 && loadProgress < 1 ? (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(loadProgress * 100)}%`,
                backgroundColor: secondaryColor || primaryColor,
              },
            ]}
          />
        </View>
      ) : null}

      {/* Main WebView Content */}
      <View style={styles.webViewWrapper}>
        {url ? (
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webView}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            injectedJavaScriptBeforeContentLoaded={INJECTED_LINK_HANDLER_JS}
            injectedJavaScript={INJECTED_LINK_HANDLER_JS}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={(request) => {
              const reqUrl = request.url.toLowerCase();
              // Native phone or email intents
              if (reqUrl.startsWith('tel:') || reqUrl.startsWith('mailto:')) {
                Linking.openURL(request.url).catch(() => {});
                return false;
              }
              // Allow all web page navigation to stay inside this WebView
              return true;
            }}
            onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
            onLoadStart={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.statusCode >= 400) {
                console.warn(`WebView HTTP error ${nativeEvent.statusCode} for ${nativeEvent.url}`);
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsBackForwardNavigationGestures={true}
            startInLoadingState={true}
            renderLoading={() => <WebViewSkeleton isDark={isDark} />}
            renderError={() => (
              <View style={styles.errorContainer}>
                <Ionicons name="globe-outline" size={48} color={colors.onSurfaceVariant} />
                <AppText style={styles.errorTitle}>Unable to load webpage</AppText>
                <AppText style={styles.errorSubtitle}>
                  Please check your internet connection and try again.
                </AppText>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: primaryColor }]}
                  onPress={handleReload}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <AppText style={styles.retryButtonText}>Try Again</AppText>
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <AppText style={styles.errorTitle}>Invalid Link</AppText>
            <AppText style={styles.errorSubtitle}>
              No URL was specified to load in the browser.
            </AppText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const stylesSkeleton = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleLine: {
    width: '75%',
    height: 22,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  subtitleLine: {
    width: '42%',
    height: 14,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  textLine: {
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardBox: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
  },
});

const createStyles = (
  colors: typeof LIGHT_COLORS,
  fonts: typeof LIGHT_FONTS,
  isDark: boolean,
  primaryColor: string,
  secondaryColor: string
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    progressBarContainer: {
      height: 2.5,
      width: '100%',
      backgroundColor: 'transparent',
    },
    progressBarFill: {
      height: '100%',
    },
    webViewWrapper: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#FFFFFF',
    },
    webView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: colors.surface,
    },
    errorTitle: {
      fontFamily: 'OpenSans-Bold',
      fontSize: 17,
      color: colors.onSurface,
      marginTop: 16,
      textAlign: 'center',
    },
    errorSubtitle: {
      fontFamily: 'OpenSans-Regular',
      fontSize: 13,
      color: colors.onSurfaceVariant,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 18,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 20,
    },
    retryButtonText: {
      fontFamily: 'OpenSans-SemiBold',
      fontSize: 14,
      color: '#FFFFFF',
    },
  });
