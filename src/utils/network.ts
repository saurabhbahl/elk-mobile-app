import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Configure NetInfo globally with active reachability check
if (Platform.OS !== 'web') {
  try {
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204,
      reachabilityShortTimeout: 3000,
      reachabilityLongTimeout: 15000,
      reachabilityRequestTimeout: 5000,
      reachabilityShouldRun: () => true,
    });
  } catch (e) {
    console.warn('[Network] NetInfo.configure failed:', e);
  }
}

/**
 * Actively checks whether the device has a working internet connection.
 * Even if Wi-Fi or mobile data is turned on, this verifies if actual packets
 * can reach the internet.
 *
 * @param timeoutMs Maximum time to wait per probe (default: 3500ms)
 * @returns Promise<boolean> true if internet is genuinely accessible, false otherwise
 */
export async function checkActualInternetConnectivity(timeoutMs: number = 3500): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // 1. Check network hardware / interface status
  try {
    const state: NetInfoState = await NetInfo.fetch();
    // Hardware interface is off / disconnected
    if (state.isConnected === false) {
      return false;
    }
    // NetInfo reachability test explicitly confirmed offline
    if (state.isInternetReachable === false) {
      return false;
    }
  } catch {
    // If NetInfo fetch throws, fall through to active probe
  }

  // 2. Active Probe 1: Google generate_204 (standard lightweight captive-portal & internet probe)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    clearTimeout(timer);
    // 204 No Content indicates a direct, working internet connection
    if (response.status === 204) {
      return true;
    }
  } catch {
    // Probe 1 timed out or encountered a network error; attempt fallback
  }

  // 3. Active Probe 2: Secondary fallback probe (google.com/generate_204 or app backend)
  try {
    const fallbackController = new AbortController();
    const fallbackTimer = setTimeout(() => fallbackController.abort(), Math.min(timeoutMs, 3000));

    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || 'https://www.google.com/generate_204';
    const response = await fetch(siteUrl, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      signal: fallbackController.signal,
    });

    clearTimeout(fallbackTimer);
    if (response.status === 204 || (response.status >= 200 && response.status < 400)) {
      return true;
    }
  } catch {
    // All probes failed — internet is not accessible
  }

  return false;
}

