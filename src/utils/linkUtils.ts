import { Linking } from 'react-native';
import { isValidData } from './validation';

export interface LinkObject {
    title: string;
    url: string;
}

/**
 * Robustly parses link data (objects, JSON strings, unquoted key-value strings, plain URLs)
 * into a clean { title: string, url: string } object for UI button rendering.
 */
export function parseLinkObject(raw: any, defaultTitle = "More Info"): LinkObject | null {
    if (!raw) return null;

    // 1. Raw is JS Object
    if (typeof raw === 'object' && raw !== null) {
        const title = raw.title || defaultTitle;
        const url = raw.url || "";
        return isValidData(url) ? { title, url } : null;
    }

    // 2. Raw is String
    if (typeof raw === 'string') {
        const str = raw.trim();
        if (!str || str === 'undefined' || str === 'null') return null;

        // Standard JSON string format
        if (str.startsWith('{') && str.endsWith('}')) {
            try {
                const parsed = JSON.parse(str);
                if (parsed && typeof parsed === 'object') {
                    const title = parsed.title || defaultTitle;
                    const url = parsed.url || "";
                    return isValidData(url) ? { title, url } : null;
                }
            } catch {
                // Fallthrough to regex
            }

            // Regex for unquoted key-value string: {title=More info, url=/visitors, target=}
            const urlMatch = str.match(/url\s*=\s*([^\s,}]+)/i);
            const titleMatch = str.match(/title\s*=\s*([^,}]+)/i);

            if (urlMatch && urlMatch[1]) {
                const extractedUrl = urlMatch[1].trim();
                const extractedTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : defaultTitle;
                return isValidData(extractedUrl) ? { title: extractedTitle, url: extractedUrl } : null;
            }
        }

        // Plain string URL format
        if (isValidData(str) && !str.includes('{')) {
            return { title: defaultTitle, url: str };
        }
    }

    return null;
}

/**
 * Global handler for opening external URLs or navigating to internal Expo Router paths.
 */
export function handleLinkPress(url: string, router: any) {
    if (!url) return;
    const cleanUrl = url.trim();

    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        Linking.openURL(cleanUrl).catch(() => { });
    } else if (cleanUrl.startsWith("/")) {
        try {
            router.push(cleanUrl as any);
        } catch {
            Linking.openURL(cleanUrl).catch(() => { });
        }
    } else {
        Linking.openURL(`https://${cleanUrl}`).catch(() => { });
    }
}
