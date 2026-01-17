import 'dotenv/config';

export default {
    expo: {
        name: "JoinQ",
        slug: "joinq",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        scheme: "joinq",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                backgroundColor: "#E6F4FE",
                foregroundImage: "./assets/images/android-icon-foreground.png",
                backgroundImage: "./assets/images/android-icon-background.png",
                monochromeImage: "./assets/images/android-icon-monochrome.png"
            },
            edgeToEdgeEnabled: false,
            predictiveBackGestureEnabled: false,
            package: "com.k3boys.qmobile"
        },
        web: {
            output: "static",
            favicon: "./assets/images/favicon.png"
        },
        plugins: [
            "expo-router",
            [
                "expo-splash-screen",
                {
                    image: "./assets/images/splash-icon.png",
                    imageWidth: 200,
                    resizeMode: "contain",
                    backgroundColor: "#ffffff",
                    dark: {
                        backgroundColor: "#000000"
                    }
                }
            ],
            "expo-secure-store"
        ],
        experiments: {
            typedRoutes: true,
            reactCompiler: true
        },
        extra: {
            QUORIX_API_KEY: process.env.EXPO_PUBLIC_QUORIX_API_KEY,
            eas: {
                projectId: "fb96b3e6-095c-4207-b0e4-f779203a8599"
            }
        }
    }
};
