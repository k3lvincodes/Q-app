import { useFonts } from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { AppState, Platform, StatusBar } from 'react-native';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const [fontsLoaded, fontError] = useFonts({
    'Helvetica': require('../assets/fonts/helvetica/Helvetica.ttf'),
    'Helvetica-Bold': require('../assets/fonts/helvetica/helvetica-rounded-bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // App State Listener for Inactivity Lock (15 mins)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground
        let lastActiveStr;
        if (Platform.OS !== 'web') {
          lastActiveStr = await SecureStore.getItemAsync('last_active');
        } else {
          lastActiveStr = localStorage.getItem('last_active');
        }

        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          const diff = Date.now() - lastActive;
          const FIFTEEN_MINUTES = 15 * 60 * 1000;

          if (diff > FIFTEEN_MINUTES) {
            // Check if biometrics enabled (Native Only)
            if (Platform.OS !== 'web') {
              const bioEnabled = await SecureStore.getItemAsync('biometric_enabled');

              if (bioEnabled === 'true') {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();

                if (hasHardware && isEnrolled) {
                  const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Session Locked due to inactivity',
                    disableDeviceFallback: true,
                    cancelLabel: 'Logout',
                  });

                  if (!result.success) {
                    // Failed to re-authenticate -> Force Logout
                    router.replace('/(auth)/login');
                  }
                }
              }
            } else {
              // Web: Maybe just force login if timeout? Or do nothing?
              // For now, let's behave safely and force login if timeout > 15m.
              // router.replace('/(auth)/login');
              // But without biometrics to "unlock", we should probably just logout.
              router.replace('/(auth)/login');
            }
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background -> Store timestamp
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync('last_active', Date.now().toString());
        } else {
          localStorage.setItem('last_active', Date.now().toString());
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(navbar)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="notification" options={{ headerShown: false }} />
      <Stack.Screen name="earnings" options={{ headerShown: false }} />
      <Stack.Screen name="newRequest" options={{ headerShown: false }} />
      <Stack.Screen name="sub_details/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="contact" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ headerShown: false }} />
      <Stack.Screen name="onboard" options={{ headerShown: false }} />
      <Stack.Screen name="envelope" options={{ headerShown: false }} />
      <StatusBar backgroundColor='black' barStyle={'default'} />
    </Stack>
  );
}
