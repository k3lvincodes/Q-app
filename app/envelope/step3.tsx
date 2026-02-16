import UserMenu from "@/components/User/UserMenu";
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationIcon from "../../assets/svg/nortification.svg";

const { width, height } = Dimensions.get('window');

export default function EnvelopeStep3() {
    const params = useLocalSearchParams();
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [giftCode, setGiftCode] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);

    // Animation values
    const envelopeScale = useRef(new Animated.Value(0.5)).current;
    const envelopeOpacity = useRef(new Animated.Value(0)).current;
    const envelopeTranslateY = useRef(new Animated.Value(0)).current;

    const giftLabels: Record<string, string> = {
        ocean_heart: 'Eternal Ocean Heart',
        fire_rose: 'Eternal Fire Rose',
        ring_flames: 'Eternal Ring of Flames',
        mythic_rose: 'Mythic Eternal Fire Rose',
        aurora_throne: 'Mythic Eternal Aurora Throne',
        dragon_love: 'Mythic Dragonbound Love',
        yinyang_love: 'Yin & Yang Mystic Love',
    };

    const giftLabel = giftLabels[params.giftType as string] || params.giftType;
    const sendViaLabels: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' };
    const sendViaLabel = sendViaLabels[params.sendVia as string] || params.sendVia;

    const generateGiftCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreateEnvelope = async () => {
        setIsLoading(true);
        try {
            const code = generateGiftCode();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('gifts')
                .insert({
                    sender_id: user.id,
                    recipient_email: params.contactInfo, // Storing contact info (email/phone) here
                    amount: parseFloat(params.recipientAmount as string),
                    fee: parseFloat(params.fee as string),
                    total_amount: parseFloat(params.totalCharge as string),
                    currency: 'NGN', // Default per requirements
                    message: params.message,
                    gift_code: code,
                    unlock_password: (params.unlockPassword as string) || null, // Optional, hashed by DB trigger
                    unlock_hint: (params.unlockHint as string) || null,
                    status: 'sent'
                });

            if (error) throw error;

            setGiftCode(code);
            setShowSuccess(true);
        } catch (error: any) {
            console.error('Error creating gift:', error);
            if (Platform.OS === 'android') {
                ToastAndroid.show(error.message || 'Failed to create gift', ToastAndroid.LONG);
            } else {
                alert(error.message || 'Failed to create gift');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = () => {
        setShowAnimation(true);

        // Start animation sequence
        Animated.sequence([
            // Appear
            Animated.parallel([
                Animated.spring(envelopeScale, { toValue: 1, useNativeDriver: true }),
                Animated.timing(envelopeOpacity, { toValue: 1, duration: 500, useNativeDriver: true })
            ]),
            // Hold
            Animated.delay(1000),
            // Fly away
            Animated.parallel([
                Animated.timing(envelopeTranslateY, { toValue: -height, duration: 800, useNativeDriver: true }),
                Animated.timing(envelopeOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
            ])
        ]).start(() => {
            // Navigate after animation
            router.push('/(navbar)/dashboard');
        });
    };

    const copyToClipboard = async () => {
        if (!giftCode) return;
        const link = `https://joinq.ng/claim?${giftCode}`;
        await Clipboard.setStringAsync(link);
        if (Platform.OS === 'android') {
            ToastAndroid.show('Link copied to clipboard', ToastAndroid.SHORT);
        }
    };

    // ------------------------------------------------------------------
    // RENDER: Animation View
    // ------------------------------------------------------------------
    if (showAnimation) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <Animated.View
                    style={{
                        transform: [{ scale: envelopeScale }, { translateY: envelopeTranslateY }],
                        opacity: envelopeOpacity,
                        alignItems: 'center'
                    }}
                >
                    {/* Simple Envelope Icon/Representation */}
                    <Ionicons name="mail" size={120} color="#EF5323" />
                    <Text className="text-white font-segoe text-2xl mt-4 font-bold">Gift Sent!</Text>
                </Animated.View>
            </View>
        );
    }

    // ------------------------------------------------------------------
    // RENDER: Success View
    // ------------------------------------------------------------------
    if (showSuccess && giftCode) {
        const link = `https://joinq.ng/claim?${giftCode}`;

        return (
            <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
                <View className="flex-1 px-5 justify-center items-center">
                    <View className="bg-white dark:bg-gray-900 w-full rounded-[20px] p-8 items-center shadow-xl shadow-black/10">
                        <View className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full justify-center items-center mb-4">
                            <Ionicons name="checkmark-sharp" size={40} color="#22C55E" />
                        </View>

                        <Text className="text-black dark:text-white text-2xl font-bold font-segoe mb-2">Gift Created!</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-center font-segoe mb-8">
                            Your gift is ready to be shared. Send the link below to {params.recipientName}.
                        </Text>

                        {/* Link Box */}
                        <View className="bg-gray-100 dark:bg-gray-800 w-full p-4 rounded-xl flex-row items-center justify-between mb-2">
                            <Text className="text-black dark:text-white font-segoe flex-1 mr-2" numberOfLines={1}>
                                {link}
                            </Text>
                            <TouchableOpacity
                                onPress={copyToClipboard}
                                className="bg-black dark:bg-white px-3 py-1.5 rounded-lg"
                            >
                                <Text className="text-white dark:text-black text-xs font-bold">Copy</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-400 text-xs font-segoe mb-8 text-center">
                            Gift Code: <Text className="font-bold text-black dark:text-white">{giftCode}</Text>
                        </Text>

                        {/* Finish Button */}
                        <TouchableOpacity
                            className="bg-[#EF5323] w-full h-[50px] justify-center items-center rounded-xl shadow-lg shadow-orange-500/20"
                            onPress={handleFinish}
                        >
                            <Text className="text-white font-bold text-lg font-segoe">Finish</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ------------------------------------------------------------------
    // RENDER: Review & Create Form
    // ------------------------------------------------------------------
    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
            {/* Dim overlay when menu is open */}
            {menuVisible && (
                <Pressable
                    className="absolute top-0 bottom-0 left-0 right-0 bg-black/20 z-50"
                    onPress={() => setMenuVisible(false)}
                />
            )}

            <UserMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
            />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 mt-[5px] mb-6">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-12 h-12 bg-white rounded-full justify-center items-center shadow-sm shadow-gray-200"
                >
                    <Ionicons name="arrow-back" size={24} color="#EF5323" />
                </TouchableOpacity>
                <Text className="text-[16px] font-segoe dark:text-white">Step 3 of 3</Text>
                <TouchableOpacity
                    onPress={() => router.push('/notification')}
                    className="w-12 h-12 bg-white rounded-full justify-center items-center shadow-sm shadow-gray-200"
                >
                    <NotificationIcon width={24} height={24} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5">

                {/* Summary Card */}
                <View className="bg-black dark:bg-white w-full rounded-[20px] p-6 mb-8 shadow-xl shadow-black/20">
                    <Text className="text-white dark:text-black text-[16px] font-segoe mb-1">To: {params.recipientName}</Text>
                    <Text className="text-white dark:text-black text-[18px] font-bold font-segoe mb-4">Q Envelope</Text>

                    <Text className="text-white dark:text-black text-[14px] font-segoe mb-4 leading-5">
                        Gift: {giftLabel} • ₦{Number(params.giftPrice).toLocaleString()} (+₦{Number(params.fee).toLocaleString()} fee) • Total ₦{Number(params.totalCharge).toLocaleString()}
                    </Text>

                    <Text className="text-white dark:text-black text-[14px] font-segoe mb-4 leading-5">
                        {params.message}
                    </Text>

                    <Text className="text-white dark:text-black text-[14px] font-segoe">
                        Delivery: {sendViaLabel} • {params.deliveryDate}
                    </Text>
                </View>

                {/* Note: Link section removed as it's not generated yet */}

            </ScrollView>

            {/* Footer Section - Outside ScrollView */}
            <View className="px-5 pb-5 pt-2 bg-[#F6F4F1] dark:bg-black">
                {/* Create/Finish Button */}
                <TouchableOpacity
                    className={`w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-lg shadow-black/20 ${isLoading ? 'bg-gray-500' : 'bg-black dark:bg-white'}`}
                    onPress={handleCreateEnvelope}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white dark:text-black font-bold text-lg font-segoe">Create Q Envelope</Text>
                    )}
                </TouchableOpacity>

                {/* Footer Text */}
                <View className="w-full items-center pt-4">
                    <Text className="text-gray-400 text-xs">Made with care by Q · Share smarter. Spend less.</Text>
                </View>
            </View>

        </SafeAreaView>
    );
}
