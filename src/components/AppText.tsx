import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

const resolveFontFamily = (style: any) => {
  if (!style) return undefined;
  
  const flattened = StyleSheet.flatten(style);
  if (!flattened) return undefined;
  
  const fontFamily = flattened.fontFamily;
  const fontWeight = flattened.fontWeight;
  
  // If font family is explicitly set to Roboto (e.g. Roboto-Regular, Roboto-Medium, Roboto-Bold, etc.),
  // we must keep it as Roboto.
  if (typeof fontFamily === 'string' && fontFamily.toLowerCase().startsWith('roboto')) {
    const isBold = fontWeight === 'bold' || 
                   fontWeight === '700' || 
                   fontWeight === '800' || 
                   fontWeight === '900' || 
                   fontFamily.toLowerCase().includes('bold');
    const isMedium = fontWeight === '500' || 
                     fontWeight === '600' || 
                     fontFamily.toLowerCase().includes('medium') || 
                     fontFamily.toLowerCase().includes('semibold');
    
    if (isBold) return 'Roboto-Bold';
    if (isMedium) return 'Roboto-Medium';
    return 'Roboto-Regular';
  }
  
  // Otherwise, map to Open Sans
  const isBold = fontWeight === 'bold' || 
                 fontWeight === '700' || 
                 fontWeight === '800' || 
                 fontWeight === '900' || 
                 (typeof fontFamily === 'string' && fontFamily.toLowerCase().includes('bold'));
                 
  const isSemiBold = fontWeight === '500' || 
                     fontWeight === '600' || 
                     (typeof fontFamily === 'string' && (fontFamily.toLowerCase().includes('medium') || fontFamily.toLowerCase().includes('semibold')));

  if (isBold) {
    return 'OpenSans-Bold';
  }
  if (isSemiBold) {
    return 'OpenSans-SemiBold';
  }
  return 'OpenSans-Regular';
};

export default function AppText(props: TextProps) {
  const resolvedFont = resolveFontFamily(props.style);
  
  return (
    <Text {...props} style={[styles.defaultText, props.style, resolvedFont ? { fontFamily: resolvedFont } : {}]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'OpenSans-Regular',
    textTransform: 'capitalize'
  },
});
