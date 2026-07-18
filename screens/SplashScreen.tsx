import React from "react";
import {
    SafeAreaView,
    ImageBackground,
    Image,
    TouchableOpacity,
    StyleSheet,
    Text,
    StatusBar,
} from "react-native";

const SplashScreen = () => {
    const onPress = () => {
        console.log("Find your Adventure");
        // navigation.navigate("Home");
    };

    return (
        <>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
            />

            <ImageBackground
                source={require("../assets/images/splash-bg.jpg")}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.container}>
                    <Image
                        source={require("../assets/images/logo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />

                    <Image
                        source={require("../assets/images/explorer.png")}
                        style={styles.explorer}
                        resizeMode="contain"
                    />

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.button}
                        onPress={onPress}
                    >
                        <Text style={styles.buttonText}>
                            Find your Adventure
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </ImageBackground>
        </>
    );
};

export default SplashScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },

    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },

    logo: {
        width: 185,
        height: 140,
        marginBottom: 20,
    },

    explorer: {
        width: 220,
        height: 75,
        marginBottom: 35,
    },

    button: {
        backgroundColor: "#454545",
        width: 210,
        height: 52,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },

    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
});