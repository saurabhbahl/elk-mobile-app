import { Alert, Linking } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export async function openExternalLink(url: string, offlineMessage?: string) {
  if (!url) return;
  
  // Tel links do not require internet connection
  if (url.startsWith('tel:')) {
    Linking.openURL(url).catch(err => console.error("Failed to make call", err));
    return;
  }

  const netInfo = await NetInfo.fetch();
  if (netInfo.isConnected === false) {
    Alert.alert(
      "Offline",
      offlineMessage || "An active internet connection is required to view this content."
    );
    return;
  }

  Linking.openURL(url).catch(err => console.error("Failed to open URL", err));
}
