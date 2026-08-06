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
 */

import { cacheImageIfNeeded, getCachedImageLocalPath, getOriginalUrl } from '@/src/utils/imageCache';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import WireframePlaceholder from './WireframePlaceholder';

interface CachedImageProps {
  /** The image URI — may be a local file:/// path, http:// URL, or null/undefined */
  uri: string | null | undefined;
  /** Style applied to the image and the placeholder */
  style?: StyleProp<ImageStyle>;
  /** How the image should fit within its bounds (default: 'cover') */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export default function CachedImage({ uri, style, contentFit = 'cover' }: CachedImageProps) {
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
      return;
    }

    setHasError(false);

    if (currentNormalized.startsWith('file://')) {
      setResolvedUri(currentNormalized);
      return;
    }

    // Try synchronous look-up from in-memory cache first
    const cachedLocal = getCachedImageLocalPath(currentNormalized);
    if (cachedLocal) {
      setResolvedUri(cachedLocal);
      return;
    }

    if (currentNormalized.startsWith('http')) {
      // Network URL — try to cache on-view if connected, otherwise use expo-image's
      // own internal cache (cachePolicy: 'disk') which survives our custom cache clear
      NetInfo.fetch().then(({ isConnected }) => {
        if (!mountedRef.current) return;
        if (isConnected) {
          cacheImageIfNeeded(currentNormalized)
            .then(local => { if (mountedRef.current) setResolvedUri(local); })
            .catch(() => { if (mountedRef.current) setResolvedUri(currentNormalized); });
        } else {
          // Offline — use the http URL; expo-image will serve from its own disk cache
          setResolvedUri(currentNormalized);
        }
      });
      return;
    }

    // Unknown scheme — use as-is
    setResolvedUri(currentNormalized);
  }, [uri]);

  const handleError = async () => {
    if (!resolvedUri) {
      if (mountedRef.current) setHasError(true);
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
        return;
      }

      // Also handle case where the uri prop itself is the http URL
      const uriStr = typeof uri === 'object' ? (uri as any)?.url : uri;
      if (typeof uriStr === 'string' && uriStr.startsWith('http') && mountedRef.current) {
        setResolvedUri(uriStr);
        setHasError(false);
        return;
      }
    }

    // http URL failed too (no network, no expo-image cache) — show placeholder
    if (mountedRef.current) setHasError(true);
  };

  const defaultStyle = { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' } as StyleProp<ImageStyle>;

  if (!resolvedUri || hasError) {
    return <WireframePlaceholder style={[defaultStyle, style]} />;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={[defaultStyle, style]}
      contentFit={contentFit}
      cachePolicy="disk"
      onError={handleError}
      transition={300}
    />
  );
}
