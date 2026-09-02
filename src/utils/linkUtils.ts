import { Linking } from 'react-native';
import { router as defaultRouter } from 'expo-router';
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
 * Checks if a given string is an external web URL (starts with http/https or contains a web domain format).
 */
export function isExternalUrl(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('tel:') || trimmed.startsWith('mailto:')) return false;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
    if (trimmed.startsWith('/')) return false;
    // Check if it's a domain pattern like keystoneelkcountryalliance.com or www.google.com
    return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/.*)?$/i.test(trimmed);
}

/**
 * Normalizes a URL ensuring proper https:// prefix for external links.
 */
export function normalizeWebUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

/**
 * Global handler for opening external URLs in the In-App WebView browser,
 * navigating internal Expo Router paths, or opening tel/mailto intents.
 */
export function handleLinkPress(url?: string | null, router?: any, title?: string) {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    const activeRouter = router || defaultRouter;

    // 1. Telephone and Email intents -> Native device handlers
    if (cleanUrl.startsWith('tel:') || cleanUrl.startsWith('mailto:')) {
        Linking.openURL(cleanUrl).catch((err) => {
            console.error('Failed to open native intent URL:', err);
        });
        return;
    }

    // 2. Relative internal app route (e.g. /visitors, /events, /map, /tips, /programs)
    if (cleanUrl.startsWith('/') && activeRouter) {
        try {
            activeRouter.push(cleanUrl as any);
            return;
        } catch (routerErr) {
            console.warn('Failed to route internally:', routerErr);
        }
    }

    // 3. External Web URL -> Open inside in-app WebView browser
    if (isExternalUrl(cleanUrl)) {
        const fullWebUrl = normalizeWebUrl(cleanUrl);
        if (activeRouter) {
            try {
                activeRouter.push({
                    pathname: '/browser',
                    params: {
                        url: fullWebUrl,
                        title: title || ''
                    }
                });
                return;
            } catch (err) {
                console.warn('Failed to push to in-app browser screen, falling back to Linking.openURL:', err);
            }
        }
        Linking.openURL(fullWebUrl).catch(() => { });
        return;
    }

    // 4. Default fallback: attempt in-app router or external linking
    if (cleanUrl.startsWith('/') && activeRouter) {
        activeRouter.push(cleanUrl as any);
    } else {
        const fullWebUrl = normalizeWebUrl(cleanUrl);
        if (activeRouter) {
            activeRouter.push({
                pathname: '/browser',
                params: {
                    url: fullWebUrl,
                    title: title || ''
                }
            });
        } else {
            Linking.openURL(fullWebUrl).catch(() => { });
        }
    }
}
