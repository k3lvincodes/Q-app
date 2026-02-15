import * as LocalAuthentication from 'expo-local-authentication';
import { Redirect, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { getContext } from "../utils/context";
import { supabase } from "../utils/supabase";

const index = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Check for manual logout first
      let manualLogout;
      if (Platform.OS !== 'web') {
        manualLogout = await SecureStore.getItemAsync('manual_logout');
      } else {
        manualLogout = localStorage.getItem('manual_logout');
      }

      if (manualLogout === 'true') {
        setDestination('/(auth)/login');
        setIsLoading(false);
        return;
      }

      // Check for unified Supabase session
      let sessionData;
      if (Platform.OS !== 'web') {
        sessionData = await SecureStore.getItemAsync('supabase_session');
      } else {
        sessionData = localStorage.getItem('supabase_session');
      }

      if (sessionData) {
        let parsedSession;
        try {
          parsedSession = JSON.parse(sessionData);
        } catch (e) {
          console.error("Invalid session JSON", e);
          setDestination('/(auth)/login');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: parsedSession.access_token,
          refresh_token: parsedSession.refresh_token,
        });

        if (error || !data.session) {
          console.log("Failed to restore session", error);
          setDestination('/(auth)/login');
          setIsLoading(false);
          return;
        }

        // Session valid, determine context
        const context = await getContext();

        let targetRoute = '/(auth)/login'; // Default fall back
        if (context === 'admin') {
          // Verify role for admin context safety
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single();
          if (profile?.role === 'super_admin') {
            targetRoute = '/(admin)/dashboard';
          } else {
            // Invalid context for role
            targetRoute = '/(auth)/login';
          }
        } else if (context === 'user') {
          targetRoute = '/(navbar)/dashboard';
        } else {
          // No context set, go to login
          targetRoute = '/(auth)/login';
        }


        // Check Biometrics (Unified) - Native Only
        if (Platform.OS !== 'web') {
          const bioEnabled = await SecureStore.getItemAsync('biometric_enabled');

          if (bioEnabled === 'true') {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Welcome back',
                disableDeviceFallback: true,
                cancelLabel: 'Cancel',
              });

              if (result.success) {
                setDestination(targetRoute);
              } else {
                // Biometric failed or cancelled -> Force login
                setDestination('/(auth)/login');
              }
            } else {
              setDestination(targetRoute);
            }
          } else {
            setDestination(targetRoute);
          }
        } else {
          // Web: Skip biometrics
          setDestination(targetRoute);
        }

      } else {
        setDestination('/(auth)/login');
      }

    } catch (err) {
      console.error('Unexpected error during session check:', err);
      setDestination('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-mainBg items-center justify-center">
        <ActivityIndicator size="large" color="#EB4219" />
      </View>
    );
  }

  if (destination) {
    return <Redirect href={destination as any} />;
  }

  return null;
};

export default index;
