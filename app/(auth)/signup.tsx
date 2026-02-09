import { Link, router } from "expo-router";
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

import { supabase } from "../../utils/supabase";
import { useGoogleAuth } from "../../utils/useGoogleAuth";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const { handleGoogleLogin, loading: googleLoading, error: googleError } = useGoogleAuth();

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
    setFullNameError("");
    setEmailError("");

    if (fullName.trim().split(' ').length < 2) {
      setFullNameError("Please enter your full name (at least two names).");
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (isValid) {
      setLoading(true);
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUser) {
          setEmailError("User already exists. Please login");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setCountdown(60);
        router.push({ pathname: '/(auth)/verify-otp', params: { email, type: 'signup', fullName } });
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
      <View className="px-6 py-4 mt-[5px] flex-row items-center gap-2">
        <Logo width={35} height={35} />
        <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1 justify-center w-4/5 mx-auto"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="items-center w-full font-helvetica mb-[80px]">
          <Text className="font-helvetica-bold text-2xl text-center">
            Create your account
          </Text>
          <Text className="text-base text-center pb-7">
            Enter your details to sign up
          </Text>

          <TextInput
            className="w-full border pl-3 border-gray-300 h-[28px] rounded-lg py-0 mt-0"
            placeholderTextColor={"gray"}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
          />
          {fullNameError ? <Text className="text-red-500 text-sm self-start mb-4">{fullNameError}</Text> : null}
          <TextInput
            className="w-full border pl-3 border-gray-300 h-[28px] rounded-lg py-0 mt-[10px]"
            placeholderTextColor={"gray"}
            placeholder="email@domain.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          {emailError ? <Text className="text-red-500 text-sm self-start mb-4">{emailError}</Text> : null}
          <TouchableOpacity onPress={handleSendOtp} disabled={countdown > 0} className={`bg-bg rounded-lg w-full h-[28px] justify-center mt-4 ${countdown > 0 ? 'opacity-60' : ''}`}>
            <Text className="text-white font-bold mx-auto">
              {loading ? <ActivityIndicator color="white" /> : (countdown > 0 ? `Resend in ${countdown}s` : 'Send OTP')}
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
            Already have an account?{' '}
            <Link href="/(auth)/login" className="text-bg font-bold">
              Login
            </Link>
          </Text>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Signup;