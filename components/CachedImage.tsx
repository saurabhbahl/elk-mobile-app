/**
 * CachedImage.tsx
 *
 * Smart image component that:
 * - Accepts a `uri` that may be a local `file:///` path (cached) or `http://` URL
 * - If the `file:///` path fails to load (stale/evicted cache), automatically
 *   falls back to the original `http://` URL when online
 * - Shows WireframePlaceholder when the image cannot be loaded at all
 * - Shows WireframePlaceholder immediately if uri is falsy
 */

import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import WireframePlaceholder from './WireframePlaceholder';
import { cacheImageIfNeeded } from '@/utils/imageCache';

interface CachedImageProps {
  /** The image URI — may be a local file:/// path, http:// URL, or null/undefined */
  uri: string | null | undefined;
  /** Style applied to the image and the placeholder */
  style?: StyleProp<ImageStyle>;
  /** How the image should fit within its bounds (default: 'cover') */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export default function CachedImage({ uri, style, contentFit = 'cover' }: CachedImageProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!uri) {
      setResolvedUri(null);
      setHasError(false);
      return;
    }

    setHasError(false);

    if (uri.startsWith('file://')) {
      // Already a local path — use directly; error handler will fall back if missing
      setResolvedUri(uri);
      return;
    }

    if (uri.startsWith('http')) {
      // Network URL — try to cache on-view if connected
      NetInfo.fetch().then(({ isConnected }) => {
        if (!mountedRef.current) return;
        if (isConnected) {
          cacheImageIfNeeded(uri)
            .then(local => { if (mountedRef.current) setResolvedUri(local); })
            .catch(() => { if (mountedRef.current) setResolvedUri(uri); });
        } else {
          setResolvedUri(uri);
        }
      });
      return;
    }

    // Unknown scheme — use as-is
    setResolvedUri(uri);
  }, [uri]);

  const handleError = async () => {
    if (!resolvedUri || !resolvedUri.startsWith('file://')) {
      // Already tried original URL — nothing more to do
      setHasError(true);
      return;
    }

    // Local file failed — fall back to original http:// URL if online
    const originalUrl = uri; // uri prop is the original URL or may already be http://
    if (originalUrl && originalUrl.startsWith('http')) {
      const { isConnected } = await NetInfo.fetch();
      if (isConnected && mountedRef.current) {
        setResolvedUri(originalUrl);
        setHasError(false);
        return;
      }
    }

    if (mountedRef.current) setHasError(true);
  };

  if (!resolvedUri || hasError) {
    return <WireframePlaceholder style={style} />;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      contentFit={contentFit}
      onError={handleError}
    />
  );
}
