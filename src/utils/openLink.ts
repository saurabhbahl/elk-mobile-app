import { Alert, Linking } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { handleLinkPress, isExternalUrl } from './linkUtils';

export async function openExternalLink(url: string, router?: any, title?: string, offlineMessage?: string) {
  if (!url) return;

  const trimmed = url.trim();

  // Tel and mailto links do not require internet connection
  if (trimmed.startsWith('tel:') || trimmed.startsWith('mailto:')) {
    Linking.openURL(trimmed).catch(err => console.error("Failed to open intent:", err));
    return;
  }

  // Internal app routes don't require internet connection
  if (trimmed.startsWith('/') && router) {
    handleLinkPress(trimmed, router, title);
    return;
  }

  // Check internet connection for external links
  if (isExternalUrl(trimmed)) {
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected === false) {
      Alert.alert(
        "Offline",
        offlineMessage || "An active internet connection is required to view this content."
      );
      return;
    }
  }

  handleLinkPress(trimmed, router, title);
}
