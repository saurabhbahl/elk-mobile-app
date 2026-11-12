import React from "react";
import { StyleSheet, View } from "react-native";

interface CompassNeedleProps {
  /** Total height of the needle in px. Defaults to 26. */
  size?: number;
  /** Width of the needle at the base in px. Defaults to 8. */
  width?: number;
  /** Color of the North-pointing needle tip. Defaults to Google Maps red (#EA4335). */
  northColor?: string;
  /** Color of the South-pointing needle tip. Defaults to silver/gray (#9CA3AF). */
  southColor?: string;
  /** Color of the center pivot dot. Defaults to white (#FFFFFF). */
  pivotColor?: string;
}

/**
 * Authentic Google Maps-style dual-color compass needle:
 * - Sharp triangular North needle in Google red (#EA4335)
 * - Sharp triangular South needle in silver/gray (#9CA3AF)
 * - Circular pivot dot in center
 */
export const CompassNeedle: React.FC<CompassNeedleProps> = ({
  size = 26,
  width = 8,
  northColor = "#EA4335",
  southColor = "#9CA3AF",
  pivotColor = "#FFFFFF",
}) => {
  const halfWidth = width / 2;
  const needleHalfHeight = Math.round(size * 0.44);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height: needleHalfHeight * 2,
        },
      ]}
      pointerEvents="none"
    >
      {/* North needle tip (Points North / UP) */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: halfWidth,
          borderRightWidth: halfWidth,
          borderBottomWidth: needleHalfHeight,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: northColor,
        }}
      />

      {/* South needle tip (Points South / DOWN) */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: halfWidth,
          borderRightWidth: halfWidth,
          borderTopWidth: needleHalfHeight,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: southColor,
        }}
      />

      {/* Center pivot pin */}
      <View
        style={[
          styles.pivot,
          {
            backgroundColor: pivotColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pivot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default CompassNeedle;

