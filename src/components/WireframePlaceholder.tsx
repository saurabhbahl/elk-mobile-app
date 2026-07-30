import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

interface WireframePlaceholderProps {
    style?: unknown;
    children?: React.ReactNode;
}

export default function WireframePlaceholder({ style, children }: WireframePlaceholderProps) {
    const [dims, setDims] = useState({ width: 0, height: 0 });

    const onLayout = (event: unknown) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setDims({ width: w, height: h });
    };

    const diagonal = Math.sqrt(dims.width * dims.width + dims.height * dims.height);
    const angle = Math.atan2(dims.height, dims.width) * (180 / Math.PI);

    return (
        <View
            onLayout={onLayout}
            style={[
                styles.container,
                style,
            ]}
        >
            {dims.width > 0 && dims.height > 0 && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            width: diagonal,
                            height: 1,
                            backgroundColor: "#B8B8B8",
                            transform: [{ rotate: `${angle}deg` }],
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            width: diagonal,
                            height: 1,
                            backgroundColor: "#B8B8B8",
                            transform: [{ rotate: `-${angle}deg` }],
                        }}
                    />
                </>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#D9D9D9",
        overflow: "hidden",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
});
