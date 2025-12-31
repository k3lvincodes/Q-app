
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Link, router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Google from '../../assets/svg/Google.svg';
import Logo from '../../assets/svg/logo.svg';

import { setContext } from "../../utils/context";
import { supabase } from "../../utils/supabase";
import { useGoogleAuth } from "../../utils/useGoogleAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);


  const [loading, setLoading] = useState(false);
  const { handleGoogleLogin, loading: googleLoading, error: googleError } = useGoogleAuth();

  useEffect(() => {
    checkBiometricLogin();
  }, []);

  const checkBiometricLogin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Skip biometrics on web
      if (Platform.OS === 'web') {
        if (!session) {
          // On web, if supabase/localStorage has a session, supabase.auth.getSession() usually returns it.
          // If we are manually managing it, we might check localStorage.
          const sessionData = localStorage.getItem('supabase_session');
          if (sessionData) {
            // Try to restore manually if needed, or just let user login.
            // Given the logic below, let's try to restore if we have it manually stored.
            const storedSession = JSON.parse(sessionData);
            await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token,
            });
            // We can check context here too if we want auto-redirect, but index.tsx handles the main routing on app load.
            // If we are on login screen, maybe we stay here unless they manually left?
            // But if we restore session successfully, we should probably redirect based on context?
            // For now, let's rely on manual login if they are on this screen.
          }
        } else {
          // If valid session exists, maybe redirect?
          // But usually index.tsx handles this.
        }
        return;
      }

      // Even if no session, we might want to check if device supports it for return users
      // But requirement says "returning user has biometric authentication enabled"
      // Usually "enabled" implies they have logged in before and enabled it in app settings.
      // We check SecureStore for the flag we presumably set when they enabled it.

      const enabled = await SecureStore.getItemAsync('biometric_enabled');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (enabled === 'true' && hasHardware && isEnrolled) {
        // Check for expiry first
        const expiryStr = await SecureStore.getItemAsync('biometric_expiry');
        if (expiryStr) {
          const expiryTime = parseInt(expiryStr, 10);
          if (Date.now() > expiryTime) {
            console.log("Biometric session expired");
            await SecureStore.deleteItemAsync('supabase_session');
            await SecureStore.deleteItemAsync('biometric_enabled');
            await SecureStore.deleteItemAsync('biometric_expiry');
            return;
          }
        }

        setIsBiometricSupported(true);

        if (session) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login with Biometrics',
            fallbackLabel: 'Use Passcode',
          });

          if (result.success) {
            // Check context before redirecting
            // Actually biometrics usually implies User context for now or whatever was last active
            // But we should probably check what context they were in?
            // For simplicity, native biometrics often maps to 'user' context unless we store admin bio separately.
            // Let's assume standard flow.
            router.replace("/(navbar)/dashboard");
          }
        } else {
          // No active session, check if we have stored session
          const sessionData = await SecureStore.getItemAsync('supabase_session');
          if (sessionData) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Login with Biometrics',
              fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
              const storedSession = JSON.parse(sessionData);
              await supabase.auth.setSession({
                access_token: storedSession.access_token,
                refresh_token: storedSession.refresh_token,
              });
              router.replace("/(navbar)/dashboard");
            }
          }
        }
      }
    } catch (error) {
      console.log('Biometric error:', error);
    }
  };

  const handleBiometricAuth = async () => {
    // Should not be called on web if button is hidden, but safe-guard
    if (Platform.OS === 'web') return;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        // Restore session from SecureStore
        const sessionData = await SecureStore.getItemAsync('supabase_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const { data, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

          if (error) {
            console.error('Session restore error:', error);
            setEmailError('Session expired. Please login again.');
            // Clear invalid session
            await SecureStore.deleteItemAsync('supabase_session');
            await SecureStore.deleteItemAsync('biometric_enabled');
            await SecureStore.deleteItemAsync('biometric_expiry');
            return;
          }

          // Verify session is valid
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user after session restore');
            setEmailError('Session expired. Please login again.');
            await SecureStore.deleteItemAsync('supabase_session');
            await SecureStore.deleteItemAsync('biometric_enabled');
            await SecureStore.deleteItemAsync('biometric_expiry');
            return;
          }

          // Refresh 24-hour expiry on successful bio-login
          const expiryDate = Date.now() + 24 * 60 * 60 * 1000;
          await SecureStore.setItemAsync('biometric_expiry', expiryDate.toString());
          await SecureStore.deleteItemAsync('manual_logout');

          // Set Context (Default to user for biometric for now, or last active?)
          // If we want to support Admin Bio, we need to know if they were admin.
          await setContext('user');
          router.replace("/(navbar)/dashboard");
        } else {
          setEmailError('No saved session. Please login with email.');
        }
      }
    } catch (error) {
      console.log('Biometric manual auth error:', error);
      setEmailError('Biometric authentication failed.');
    }
  };



  useEffect(() => {
    let interval: any;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendOtp = async () => {
    let isValid = true;
    setEmailError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (isValid) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;

        setCountdown(60);
        router.push({ pathname: '/(auth)/verify-otp', params: { email, type: 'login' } });
      } catch (error: any) {
        console.error('Supabase OTP Error:', error);
        setEmailError(error.message || "Failed to send OTP. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 py-4 mt-[0px] flex-row items-center gap-2">
        <Logo width={35} height={35} />
        <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1 justify-center w-4/5 mx-auto"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="items-center w-full font-helvetica mb-[80px]">
          <Text className="font-helvetica-bold text-2xl text-center">
            Login your account
          </Text>
          <Text className="text-base text-center pb-7">
            Enter your email to login
          </Text>

          <TextInput
            className="w-full border pl-3 border-gray-300 h-[28px] rounded-lg py-0 mt-0"
            placeholderTextColor={"gray"}
            placeholder="email@domain.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          {emailError ? <Text className="text-red-500 text-sm self-start mb-4">{emailError}</Text> : null}
          <TouchableOpacity onPress={handleSendOtp} disabled={countdown > 0} className={`bg-bg rounded-lg w-full h-[28px] justify-center mt-4 ${countdown > 0 ? 'opacity-60' : ''}`}>
            <Text className="text-white font-bold mx-auto">
              {loading ? <ActivityIndicator color="white" /> : (countdown > 0 ? `Resend in ${countdown} s` : 'Send OTP')}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center w-full my-4">
            <View className="flex-1 h-[1px] bg-gray-200" />
            <Text className="mx-4 text-gray-400">or continue with</Text>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>

          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            className={`flex-row items-center w-full h-[28px] bg-[#F2B09F] rounded-lg mb-2 relative justify-center ${googleLoading ? 'opacity-70' : ''}`}
          >
            {googleLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <View className="absolute left-4">
                  <Google width={16} height={16} />
                </View>
                <Text className="font-bold text-white">Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text className="text-center pt-5 text-gray-500">
            Don't have an account?{' '}
            <Link href="/(auth)/signup" className="text-bg font-bold">
              Sign Up
            </Link>
          </Text>

          {isBiometricSupported && (
            <TouchableOpacity onPress={handleBiometricAuth} className="items-center mt-[50px]">
              <Ionicons name="finger-print" size={60} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;