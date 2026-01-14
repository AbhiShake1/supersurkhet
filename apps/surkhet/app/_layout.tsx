import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ConfigProvider } from "@/contexts/ConfigContext";

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	useEffect(() => {
		if (Platform.OS === "web" && "serviceWorker" in navigator) {
			window.addEventListener("load", () => {
				navigator.serviceWorker.register("/sw.js").then(
					(registration) => {
						console.log("SW registered: ", registration);
					},
					(registrationError) => {
						console.log("SW registration failed: ", registrationError);
					},
				);
			});
		}
	}, []);

	if (!loaded) {
		// Async font loading only occurs in development.
		return null;
	}

	return (
		<ConfigProvider>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="+not-found" />
				</Stack>
				<StatusBar style="auto" />
			</ThemeProvider>
		</ConfigProvider>
	);
}
