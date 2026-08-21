import { width } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useAppContentData } from "@/src/contexts/AppContentContext";
import React from "react";
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';

const systemFonts = [...defaultSystemFonts, 'OpenSans-Regular', 'OpenSans-Bold', 'OpenSans-Light', 'Roboto-Regular', 'Roboto-Bold'];

interface AppRenderHTMLProps {
    html: string;
    contentWidth?: number;
    baseStyle?: any;
    tagsStyles?: any;
}

export default function AppRenderHTML({ html, contentWidth = width - 32, baseStyle, tagsStyles }: AppRenderHTMLProps) {
    const { colors } = useTheme();
    const { brandData } = useAppContentData();
    
    const secondaryColor = brandData?.brand_color_secondary 
        ? (brandData.brand_color_secondary.startsWith('#') ? brandData.brand_color_secondary : `#${brandData.brand_color_secondary}`) 
        : "";
    
    // Lock base and bold font family to OpenSans
    const baseFont = 'OpenSans-Regular';
    const boldFont = 'OpenSans-Bold';

    const defaultBaseStyle = {
        fontFamily: baseFont,
        fontSize: baseStyle?.fontSize || 13,
        color: baseStyle?.color || colors.onSurface,
        lineHeight: baseStyle?.lineHeight || 20,
        textAlign: baseStyle?.textAlign || "left",
    };

    // Remove forced font weights and styles from the root to let nested tag styles apply correctly
    const cleanBaseStyle = { ...baseStyle };
    delete cleanBaseStyle.fontWeight;
    delete cleanBaseStyle.fontStyle;

    const mergedBaseStyle = {
        ...defaultBaseStyle,
        ...cleanBaseStyle,
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

    return (
        <RenderHTML
            systemFonts={systemFonts}
            contentWidth={contentWidth}
            source={{ html: html || "" }}
            baseStyle={mergedBaseStyle as any}
            tagsStyles={mergedTagsStyles as any}
        />
    );
}
