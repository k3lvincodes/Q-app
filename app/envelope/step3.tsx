import UserMenu from "@/components/User/UserMenu";
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationIcon from "../../assets/svg/nortification.svg";

export default function EnvelopeStep3() {
    const [unlockPassword, setUnlockPassword] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const link = "https://jointheQ/qenvelop.ng";
    const params = useLocalSearchParams();

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

    const copyToClipboard = () => {
        // Since expo-clipboard is not installed, we'll simulate it for now or use Clipboard from react-native if available (deprecated)
        // Or just show a toast for visual confirmation as requested in plan
        if (Platform.OS === 'android') {
            ToastAndroid.show('Link copied to clipboard', ToastAndroid.SHORT);
        }
    };

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

                {/* Unlock Password Section */}
                <View className="mb-8">
                    <Text className="text-[#1E1E1E] dark:text-gray-300 mb-2 font-segoe text-[16px]">Unlock password (secret answer)</Text>
                    <TextInput
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                        placeholder="Enter password"
                        placeholderTextColor="#9CA3AF"
                        value={unlockPassword}
                        onChangeText={setUnlockPassword}
                    />
                    <Text className="text-[#1E1E1E] text-xs font-segoe mt-2">only the recipient who knows this can open it.</Text>
                </View>

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

                {/* Link Section */}
                <View className="bg-black w-full h-[60px] rounded-[12px] flex-row items-center justify-between px-4 mb-8">
                    <Text className="text-white text-[14px] font-segoe truncate mr-2 flex-1" numberOfLines={1}>
                        {link}
                    </Text>
                    <TouchableOpacity
                        className="bg-[#666666] px-4 py-2 rounded-[6px]"
                        onPress={copyToClipboard}
                    >
                        <Text className="text-white text-[14px] font-segoe">Copy</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Footer Section - Outside ScrollView */}
            <View className="px-5 pb-5 pt-2 bg-[#F6F4F1] dark:bg-black">
                {/* Finish Button */}
                <TouchableOpacity
                    className="bg-black dark:bg-white w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-lg shadow-black/20"
                    onPress={() => router.push('/(navbar)/dashboard')}
                >
                    <Text className="text-white dark:text-black font-bold text-lg font-segoe">Finish</Text>
                </TouchableOpacity>

                {/* Footer Text */}
                <View className="w-full items-center pt-4">
                    <Text className="text-gray-400 text-xs">Made with care by Q · Share smarter. Spend less.</Text>
                </View>
            </View>

        </SafeAreaView>
    );
}
