import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withDelay,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { getContext } from '../../utils/context';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SuccessAnimation = () => {
    const circleProgress = useSharedValue(0);
    const checkProgress = useSharedValue(0);

    useEffect(() => {
        circleProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
        checkProgress.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) }));
    }, []);

    const circleProps = useAnimatedProps(() => ({
        strokeDashoffset: 300 * (1 - circleProgress.value),
    }));

    const checkProps = useAnimatedProps(() => ({
        strokeDashoffset: 100 * (1 - checkProgress.value),
    }));

    return (
        <View className="items-center justify-center mb-6">
            <Svg width="120" height="120" viewBox="0 0 100 100">
                <AnimatedCircle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#EB4219"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="300"
                    animatedProps={circleProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="50, 50"
                />
                <AnimatedPath
                    d="M30 50 L45 65 L70 35"
                    stroke="#EB4219"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="100"
                    animatedProps={checkProps}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
};

const VerifyOtp = () => {
    const params = useLocalSearchParams();
    const email = params.email as string;
    const type = params.type as string;
    const fullName = params.fullName as string;

    const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const inputs = useRef<Array<TextInput | null>>([]);

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        if (text.length > 1) {
            const pastedData = text.slice(0, OTP_LENGTH).split('');
            for (let i = 0; i < OTP_LENGTH; i++) {
                if (i >= index && pastedData[i - index]) {
                    newOtp[i] = pastedData[i - index];
                }
            }
            setOtp(newOtp);
            const lastIndex = Math.min(index + pastedData.length, OTP_LENGTH - 1);
            inputs.current[lastIndex]?.focus();
        } else {
            newOtp[index] = text;
            setOtp(newOtp);

            if (text && index < OTP_LENGTH - 1) {
                inputs.current[index + 1]?.focus();
            }

            if (newOtp.join('').length === OTP_LENGTH) {
                Keyboard.dismiss();
            }
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const token = otp.join('');
        if (token.length !== OTP_LENGTH) {
            setError('Please enter the full code.');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email',
            });

            if (verifyError) throw verifyError;

            if (data.session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.session.user.id)
                    .single();

                const isSuperAdmin = profile?.role === 'super_admin';

                // Set context based on role
                const context = isSuperAdmin ? 'admin' : 'user';

                if (Platform.OS !== 'web') {
                    await SecureStore.setItemAsync('authToken', data.session.access_token);
                    await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                        access_token: data.session.access_token,
                        refresh_token: data.session.refresh_token,
                    }));
                    await SecureStore.setItemAsync('biometric_enabled', 'true');
                    const expiryDate = Date.now() + 24 * 60 * 60 * 1000;
                    await SecureStore.setItemAsync('biometric_expiry', expiryDate.toString());
                    await SecureStore.setItemAsync('user_email', email as string);
                    await SecureStore.deleteItemAsync('manual_logout');
                    await SecureStore.setItemAsync('active_context', context);
                } else {
                    localStorage.setItem('authToken', data.session.access_token);
                    localStorage.setItem('supabase_session', JSON.stringify({
                        access_token: data.session.access_token,
                        refresh_token: data.session.refresh_token,
                    }));
                    localStorage.setItem('user_email', email as string);
                    localStorage.removeItem('manual_logout');
                    localStorage.setItem('active_context', context);
                }

                if (type === 'signup' && fullName) {
                    await supabase.auth.updateUser({
                        data: { full_name: fullName }
                    });
                }

                if (isSuperAdmin) {
                    setSuccess(true);
                    router.replace('/(admin)/dashboard');
                } else {
                    setSuccess(true);
                    router.replace('/(navbar)/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        const context = await getContext();
        if (context === 'admin') {
            router.replace('/(admin)/dashboard');
        } else {
            router.replace('/(navbar)/dashboard');
        }
    };

    if (success) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
                <SuccessAnimation />
                <Text className="text-2xl font-bold text-black mb-2 text-center">Success!</Text>
                <Text className="text-gray-500 text-center mb-10 px-4">
                    Congratulations! You have been successfully authenticated.
                </Text>

                <TouchableOpacity
                    className="w-full bg-[#EB4219] py-4 rounded-full shadow-lg shadow-orange-200"
                    onPress={handleContinue}
                >
                    <Text className="text-center text-white font-bold text-lg">Continue</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white pb-6">
            <View className="px-6 py-4 mt-[0px]">
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color="gray" />
                </TouchableOpacity>
            </View>

            <View className="px-6">
                <Text className="text-2xl font-bold text-black mb-2">Verification Code</Text>
                <Text className="text-gray-500 mb-10">We have sent the verification code to your email address. It expires in 5 minutes.</Text>
            </View>

            <View className="px-6">
                <View className="flex-row justify-between mb-8 gap-1">
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={OTP_LENGTH}
                            className={`w-9 h-14 border rounded-xl text-center text-2xl font-bold text-black
                                ${digit ? 'border-[#EB4219]' : 'border-gray-200'}
                                bg-white`}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}

                <TouchableOpacity
                    className={`w-full bg-[#EB4219] py-4 rounded-full shadow-lg shadow-orange-200 mb-6 ${loading ? 'opacity-80' : ''}`}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-center text-white font-bold text-lg">Confirm</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default VerifyOtp;
