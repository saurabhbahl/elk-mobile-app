import { width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import { cacheImageIfNeeded, getCachedImageLocalPath, preloadManifestCache } from "@/src/utils/imageCache";
import { handleLinkPress } from "@/src/utils/linkUtils";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Dimensions, View } from "react-native";
import RenderHTML, { defaultSystemFonts, useContentWidth } from 'react-native-render-html';

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];

function HTMLImageRenderer({ tnode }: any) {
    const rawSrc = tnode?.attributes?.src || tnode?.attributes?.['data-src'] || tnode?.attributes?.['data-lazy-src'];
    if (!rawSrc) return null;

    const cleanSrc = rawSrc.replace(/&amp;/g, '&');
    const cachedLocal = getCachedImageLocalPath(cleanSrc) || getCachedImageLocalPath(rawSrc);
    const imageUri = cachedLocal || cleanSrc;

    const contextWidth = useContentWidth();
    const availableWidth = (typeof contextWidth === 'number' && contextWidth > 0)
        ? contextWidth
        : (Dimensions.get('window').width - 32);

    const widthAttr = parseFloat(tnode?.attributes?.width);
    const heightAttr = parseFloat(tnode?.attributes?.height);
    const hasDimensions = !isNaN(widthAttr) && !isNaN(heightAttr) && widthAttr > 0 && heightAttr > 0;

    const initialRatio = hasDimensions ? (widthAttr / heightAttr) : (16 / 9);
    const [aspectRatio, setAspectRatio] = React.useState<number>(initialRatio);

    const targetWidth = hasDimensions
        ? Math.min(widthAttr, availableWidth)
        : availableWidth;

    const targetHeight = Math.round(targetWidth / (aspectRatio || (16 / 9)));

    return (
        <View style={{ width: targetWidth, height: targetHeight, marginVertical: 8, alignSelf: 'center', overflow: 'hidden' }}>
            <Image
                source={{ uri: imageUri }}
                style={{ width: targetWidth, height: targetHeight }}
                contentFit="contain"
                cachePolicy="disk"
                onLoad={(e) => {
                    if (!hasDimensions && e.source?.width && e.source?.height) {
                        setAspectRatio(e.source.width / e.source.height);
                    }
                }}
            />
        </View>
    );
}

const customRenderers = {
    img: HTMLImageRenderer,
};

interface AppRenderHTMLProps {
    html: string;
    contentWidth?: number;
    baseStyle?: any;
    tagsStyles?: any;
}

export default function AppRenderHTML({ html, contentWidth = width - 32, baseStyle, tagsStyles }: AppRenderHTMLProps) {
    const { colors } = useTheme();
    const { brandData } = useAppContentData();
    const { width: screenWidth } = Dimensions.get('window');
    const extraSize = screenWidth >= 600 ? 4 : 0;
    
    const secondaryColor = brandData?.brand_color_secondary 
        ? (brandData.brand_color_secondary.startsWith('#') ? brandData.brand_color_secondary : `#${brandData.brand_color_secondary}`) 
        : "";
    
    // Lock base and bold font family to OpenSans
    const baseFont = 'OpenSans-Regular';
    const boldFont = 'OpenSans-Bold';

    const rawFontSize = baseStyle?.fontSize || 14;
    const rawLineHeight = baseStyle?.lineHeight || 20;

    const defaultBaseStyle = {
        fontFamily: baseFont,
        fontSize: rawFontSize + extraSize,
        color: baseStyle?.color || colors.onSurface,
        lineHeight: rawLineHeight + extraSize,
        textAlign: baseStyle?.textAlign || "left",
    };

    // Remove forced font weights and styles from the root to let nested tag styles apply correctly
    const cleanBaseStyle = { ...baseStyle };
    delete cleanBaseStyle.fontWeight;
    delete cleanBaseStyle.fontStyle;

    const mergedBaseStyle = {
        ...defaultBaseStyle,
        ...cleanBaseStyle,
        fontSize: rawFontSize + extraSize,
        lineHeight: rawLineHeight + extraSize,
    };

    const defaultTagsStyles = {
        p: { 
            textAlign: mergedBaseStyle.textAlign, 
            marginVertical: 4 
        },
        strong: { 
            fontFamily: boldFont, 
            fontWeight: 'bold' as const 
        },
        b: { 
            fontFamily: boldFont, 
            fontWeight: 'bold' as const 
        },
        em: { 
            fontStyle: 'italic' as const 
        },
        i: { 
            fontStyle: 'italic' as const 
        },
        a: { 
            color: secondaryColor || colors.primary || '#007AFF', 
            textDecorationLine: 'underline' as const 
        },
    };

    const mergedTagsStyles = {
        ...defaultTagsStyles,
        ...tagsStyles,
        strong: {
            ...defaultTagsStyles.strong,
            ...(tagsStyles?.strong || {}),
        },
        b: {
            ...defaultTagsStyles.b,
            ...(tagsStyles?.b || {}),
        },
        em: {
            ...defaultTagsStyles.em,
            ...(tagsStyles?.em || {}),
        },
        i: {
            ...defaultTagsStyles.i,
            ...(tagsStyles?.i || {}),
        },
        a: {
            ...defaultTagsStyles.a,
            ...(tagsStyles?.a || {}),
        },
    };

    const [, setManifestVersion] = React.useState(0);

    React.useEffect(() => {
        preloadManifestCache()
            .then(() => setManifestVersion((v) => v + 1))
            .catch(() => {});
    }, []);

    // Opportunistically cache any remote images found in HTML while online
    React.useEffect(() => {
        if (!html || !html.includes("http")) return;
        const imgRegex = /<img\b[^>]*?\bsrc=["'](https?:\/\/[^"'\s>]+)["']/gi;
        let match: RegExpExecArray | null;
        while ((match = imgRegex.exec(html)) !== null) {
            const src = match[1];
            if (src && !getCachedImageLocalPath(src)) {
                cacheImageIfNeeded(src)
                    .then((local) => {
                        if (local && local.startsWith("file://")) {
                            setManifestVersion((v) => v + 1);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [html]);

    const renderersProps = React.useMemo(() => ({
        a: {
            onPress: (_event: any, href: string) => {
                if (href) {
                    handleLinkPress(href, router);
                }
            },
        },
    }), []);

    return (
        <RenderHTML
            systemFonts={systemFonts}
            contentWidth={contentWidth}
            source={{ html: html || "" }}
            baseStyle={mergedBaseStyle as any}
            tagsStyles={mergedTagsStyles as any}
            renderersProps={renderersProps}
            renderers={customRenderers}
        />
    );
}
