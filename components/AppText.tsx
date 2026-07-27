import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export default function AppText(props: TextProps) {
  return (
    <Text {...props} style={[styles.defaultText, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Lexend_500Medium',
    textTransform: 'capitalize',
  },
});
