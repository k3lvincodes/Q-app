import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';

const data = [
    { label: 'Digital Flowers', value: 'flowers' },
    { label: 'Digital Chocolates', value: 'chocolates' },
    { label: 'Love Letter', value: 'letter' },
    { label: 'Gift Card', value: 'giftcard' },
];

export default function EnvelopeStep1() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [sendingType, setSendingType] = useState('flowers');
    const [value, setValue] = useState('5000');
    const [message, setMessage] = useState('');
    const [isFocus, setIsFocus] = useState(false);

    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 mt-[5px]">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white rounded-full">
                        <Ionicons name="arrow-back" size={24} color="#EF5323" />
                    </TouchableOpacity>
                    <Text className="text-[16px] font-segoe dark:text-white">Step 1 of 3</Text>
                    <TouchableOpacity onPress={() => { }} className="p-2 bg-white rounded-full">
                        <Ionicons name="notifications-outline" size={24} color="#EF5323" />
                    </TouchableOpacity>
                </View>
                <ScrollView className="flex-1 px-5">

                    {/* Form */}
                    <View className="mt-[41px]">

                        {/* Name Input */}
                        <View className="mb-[10px]">
                            <Text className="text-gray-700 dark:text-gray-300 mb-[5px] font-segoe text-[16px]">Your name</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                                placeholder="Enter Your name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* What are you sending */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">What are you sending</Text>
                            <Dropdown
                                style={{
                                    height: 48,
                                    backgroundColor: isDark ? '#111827' : 'white', // dark:bg-gray-900
                                    borderColor: isDark ? '#1F2937' : '#E5E7EB', // dark:border-gray-800 : gray-200
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                }}
                                placeholderStyle={{ color: '#9CA3AF', fontSize: 14 }}
                                selectedTextStyle={{ color: isDark ? 'white' : 'black', fontSize: 14 }}
                                inputSearchStyle={{ height: 40, fontSize: 16 }}
                                iconStyle={{ width: 20, height: 20 }}
                                iconColor={isDark ? '#9CA3AF' : 'gray'}
                                containerStyle={{
                                    backgroundColor: isDark ? '#111827' : 'white',
                                    borderColor: isDark ? '#1F2937' : '#E5E7EB',
                                    borderRadius: 12,
                                }}
                                itemTextStyle={{ color: isDark ? 'white' : 'black' }}
                                activeColor={isDark ? '#374151' : '#F3F4F6'} // dark:bg-gray-700 : bg-gray-100
                                data={data}
                                search={false}
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder={!isFocus ? 'Select item' : '...'}
                                searchPlaceholder="Search..."
                                value={sendingType}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={item => {
                                    setSendingType(item.value);
                                    setIsFocus(false);
                                }}
                            />
                        </View>

                        {/* Gift Value */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Gift value (₦)</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                                value={value}
                                onChangeText={setValue}
                                keyboardType="numeric"
                            />
                            <Text className="text-xs text-gray-500 mt-[10px]">
                                You’ll be charged ₦{(parseInt(value || '0') + 100).toLocaleString()} total (gift + ₦100 fee).
                            </Text>
                        </View>


                        {/* Message & Suggest Button Group */}
                        <View>
                            <View>
                                <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Message inside the envelope</Text>
                                <TextInput
                                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-black dark:text-white font-segoe h-[197px] text-top"
                                    placeholder="Write something sweet...."
                                    placeholderTextColor="#9CA3AF"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Suggest Button */}
                            <TouchableOpacity
                                className="mt-[10px] bg-[#990000] w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-md shadow-red-900/20"
                                onPress={() => { }}
                            >
                                <Text className="text-white font-bold text-lg font-segoe mr-2">Suggest message</Text>
                                <Ionicons name="sparkles-outline" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>

                {/* Footer Section - Outside ScrollView */}
                <View className="px-5 pb-5 pt-[10px] bg-[#F6F4F1] dark:bg-black">
                    {/* Continue Button */}
                    <TouchableOpacity
                        className="bg-black dark:bg-white w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-lg shadow-black/20"
                        onPress={() => router.push('/envelope/step2')}
                    >
                        <Text className="text-white dark:text-black font-bold text-lg font-segoe">Continue</Text>
                    </TouchableOpacity>

                    {/* Footer Text */}
                    <View className="w-full items-center pt-4">
                        <Text className="text-gray-400 text-xs">Made with care by Q · Share smarter. Spend less.</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
