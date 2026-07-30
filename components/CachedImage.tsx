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

import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import WireframePlaceholder from './WireframePlaceholder';
import { cacheImageIfNeeded, getOriginalUrl } from '@/utils/imageCache';

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
    // Normalize uri: handle object shape { url: string }, numbers, or other non-strings
    let normalized: string | null = null;
    if (uri && typeof uri === 'object' && (uri as any).url) {
      normalized = (uri as any).url;
    } else if (typeof uri === 'string' && uri.length > 0) {
      normalized = uri;
    }

    if (!normalized) {
      setResolvedUri(null);
      setHasError(false);
      return;
    }

    setHasError(false);

    if (normalized.startsWith('file://')) {
      // Already a local path — use directly; error handler will fall back if missing
      setResolvedUri(normalized);
      return;
    }

    if (normalized.startsWith('http')) {
      // Network URL — try to cache on-view if connected, otherwise use expo-image's
      // own internal cache (cachePolicy: 'disk') which survives our custom cache clear
      NetInfo.fetch().then(({ isConnected }) => {
        if (!mountedRef.current) return;
        if (isConnected) {
          cacheImageIfNeeded(normalized!)
            .then(local => { if (mountedRef.current) setResolvedUri(local); })
            .catch(() => { if (mountedRef.current) setResolvedUri(normalized); });
        } else {
          // Offline — use the http URL; expo-image will serve from its own disk cache
          setResolvedUri(normalized);
        }
      });
      return;
    }

    // Unknown scheme — use as-is
    setResolvedUri(normalized);
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
      if (uri && uri.startsWith('http') && mountedRef.current) {
        setResolvedUri(uri);
        setHasError(false);
        return;
      }
    }

    // http URL failed too (no network, no expo-image cache) — show placeholder
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
      cachePolicy="disk"
      onError={handleError}
    />
  );
}
