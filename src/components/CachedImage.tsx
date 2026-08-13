/**
 * CachedImage.tsx
 *
 * Smart image component that:
 * - Accepts a `uri` that may be a local `file:///` path (cached) or `http://` URL
 * - If the `file:///` path fails to load (stale/evicted cache), looks up the
 *   original http:// URL in the image cache manifest and falls back to it when online,
 *   or lets expo-image serve it from its own internal disk cache when offline
 * - Shows WireframePlaceholder when the image cannot be loaded at all
 * - Shows WireframePlaceholder immediately if uri is falsy
 * - Shows SkeletonPlaceholder while the image uri is resolving or the image is loading
 */

import { cacheImageIfNeeded, getCachedImageLocalPath, getOriginalUrl } from '@/src/utils/imageCache';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';
import WireframePlaceholder from './WireframePlaceholder';

interface CachedImageProps {
  /** The image URI — may be a local file:/// path, http:// URL, or null/undefined */
  uri: string | null | undefined;
  /** Style applied to the image and the placeholder */
  style?: StyleProp<ImageStyle>;
  /** How the image should fit within its bounds (default: 'cover') */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Callback fired when the loading state changes */
  onLoadStateChange?: (isLoading: boolean) => void;
}

export default function CachedImage({ uri, style, contentFit = 'cover', onLoadStateChange }: CachedImageProps) {
  // Normalize uri helper to resolve initial values synchronously
  const getNormalizedUri = (inputUri: any): string | null => {
    if (inputUri && typeof inputUri === 'object' && inputUri.url) {
      return inputUri.url;
    } else if (typeof inputUri === 'string' && inputUri.length > 0) {
      return inputUri;
    }
    return null;
  };

  const normalized = getNormalizedUri(uri);
  const initialUri = normalized
    ? (normalized.startsWith('file://') ? normalized : getCachedImageLocalPath(normalized) || null)
    : null;

  const [resolvedUri, setResolvedUri] = useState<string | null>(initialUri);
  const [hasError, setHasError] = useState(false);
  const [isResolving, setIsResolving] = useState<boolean>(!initialUri && !!normalized);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const currentNormalized = getNormalizedUri(uri);

    if (!currentNormalized) {
      setResolvedUri(null);
      setHasError(false);
      setIsResolving(false);
      return;
    }

    setHasError(false);
    setIsResolving(true);
    setIsImageLoading(true);

    if (currentNormalized.startsWith('file://')) {
      setResolvedUri(currentNormalized);
      setIsResolving(false);
      return;
    }

    // Try synchronous look-up from in-memory cache first
    const cachedLocal = getCachedImageLocalPath(currentNormalized);
    if (cachedLocal) {
      setResolvedUri(cachedLocal);
      setIsResolving(false);
      return;
    }

    if (currentNormalized.startsWith('http')) {
      // Network URL — try to cache on-view if connected, otherwise use expo-image's
      // own internal cache (cachePolicy: 'disk') which survives our custom cache clear
      NetInfo.fetch().then(({ isConnected }) => {
        if (!mountedRef.current) return;
        if (isConnected) {
          cacheImageIfNeeded(currentNormalized)
            .then(local => {
              if (mountedRef.current) {
                setResolvedUri(local);
                setIsResolving(false);
              }
            })
            .catch(() => {
              if (mountedRef.current) {
                setResolvedUri(currentNormalized);
                setIsResolving(false);
              }
            });
        } else {
          // Offline — use the http URL; expo-image will serve from its own disk cache
          setResolvedUri(currentNormalized);
          setIsResolving(false);
        }
      });
      return;
    }

    // Unknown scheme — use as-is
    setResolvedUri(currentNormalized);
    setIsResolving(false);
  }, [uri]);

  const handleError = async () => {
    if (!resolvedUri) {
      if (mountedRef.current) {
        setHasError(true);
        setIsImageLoading(false);
      }
      return;
    }

    // If local file:/// failed — look up the original http:// URL from the manifest
    if (resolvedUri.startsWith('file://')) {
      // First try: look up original URL from our own manifest
      const originalUrl = await getOriginalUrl(resolvedUri);
      if (originalUrl && mountedRef.current) {
        // Use http URL — expo-image will serve from its own disk cache offline,
        // or re-download if online
        setResolvedUri(originalUrl);
        setHasError(false);
        setIsImageLoading(true);
        return;
      }

      // Also handle case where the uri prop itself is the http URL
      const uriStr = typeof uri === 'object' ? (uri as any)?.url : uri;
      if (typeof uriStr === 'string' && uriStr.startsWith('http') && mountedRef.current) {
        setResolvedUri(uriStr);
        setHasError(false);
        setIsImageLoading(true);
        return;
      }
    }

    // http URL failed too (no network, no expo-image cache) — show placeholder
    if (mountedRef.current) {
      setHasError(true);
      setIsImageLoading(false);
    }
  };

  const defaultStyle = { width: '100%', aspectRatio: 4 / 3, backgroundColor: 'rgba(0,0,0,0.05)' } as StyleProp<ImageStyle>;

  const showSkeleton = isResolving || (!!resolvedUri && isImageLoading);

  useEffect(() => {
    if (onLoadStateChange) {
      onLoadStateChange(showSkeleton);
    }
  }, [showSkeleton, onLoadStateChange]);

  if (hasError || (!isResolving && !resolvedUri)) {
    return <WireframePlaceholder style={[defaultStyle, style]} />;
  }

  return (
    <View style={[{ overflow: 'hidden', borderWidth: 0, backgroundColor: '#f1f1f1ff' }, defaultStyle, style]}>
      {resolvedUri ? (
        <Image
          source={{ uri: resolvedUri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="disk"
          onError={handleError}
          onLoad={() => { if (mountedRef.current) setIsImageLoading(false); }}
          transition={300}
        />
      ) : null}

      {showSkeleton && (
        <SkeletonPlaceholder style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}
