import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function EnvelopeStep3() {
    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 mt-[5px]">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white rounded-full">
                    <Ionicons name="arrow-back" size={24} color="#EF5323" />
                </TouchableOpacity>
                <Text className="text-[16px] font-segoe dark:text-white">Review Envelope</Text>
                <TouchableOpacity onPress={() => { }} className="p-2 bg-white rounded-full">
                    <Ionicons name="notifications-outline" size={24} color="#EF5323" />
                </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 px-5">

                <View className="mt-6 items-center">
                    <View className="bg-[#991B1B] w-full rounded-[30px] p-8 items-center relative overflow-hidden shadow-xl shadow-red-900/40">
                        {/* Background Hearts Pattern (Reused from Dashboard) */}
                        <View className="absolute -left-4 -top-8 opacity-40 transform -rotate-12">
                            <Ionicons name="heart-outline" size={90} color="white" />
                        </View>
                        <View className="absolute right-4 -bottom-8 opacity-40 transform -rotate-45">
                            <Ionicons name="heart-outline" size={70} color="white" />
                        </View>

                        <Text className="text-white/80 font-segoe mb-2">Sending to</Text>
                        <Text className="text-white text-3xl font-bold font-segoe mb-8">Recipient Name</Text>

                        <View className="bg-white/20 px-6 py-3 rounded-full backdrop-blur-md mb-8">
                            <Text className="text-white font-bold text-xl">₦5,000</Text>
                        </View>

                        <Text className="text-white/80 font-segoe mb-2">Message</Text>
                        <Text className="text-white font-serif italic text-center px-4">
                            "This is a digital envelope sent with love. Hope you enjoy it!"
                        </Text>
                    </View>
                </View>

                <View className="mt-8 space-y-4">
                    <View className="flex-row justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl">
                        <Text className="text-gray-500 dark:text-gray-400">Gift Value</Text>
                        <Text className="text-black dark:text-white font-bold">₦5,000</Text>
                    </View>
                    <View className="flex-row justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl">
                        <Text className="text-gray-500 dark:text-gray-400">Service Fee</Text>
                        <Text className="text-black dark:text-white font-bold">₦100</Text>
                    </View>
                    <View className="flex-row justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-[#EF5323]">
                        <Text className="text-[#EF5323] font-bold">Total to Pay</Text>
                        <Text className="text-[#EF5323] font-bold text-xl">₦5,100</Text>
                    </View>
                </View>

                {/* Pay Button */}
                <View className="mt-10 mb-10">
                    <TouchableOpacity
                        className="bg-black dark:bg-white w-full py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-black/20"
                        onPress={() => {
                            // Here we would handle payment logic
                            // For now we just go back to dashboard
                            router.push('/(navbar)/dashboard');
                        }}
                    >
                        <Text className="text-white dark:text-black font-bold text-lg font-segoe">Pay & Send Envelope</Text>
                        <Ionicons name="paper-plane-outline" size={20} color="white" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
