import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const sendViaData = [
    { label: "What's app", value: 'whatsapp' },
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
];

export default function EnvelopeStep2() {
    const [recipientName, setRecipientName] = useState('');
    const [sendVia, setSendVia] = useState('whatsapp');
    const [contactInfo, setContactInfo] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [unlockHint, setUnlockHint] = useState('');
    const [isFocus, setIsFocus] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

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
                    <Text className="text-[16px] font-segoe dark:text-white">Step 2 of 3</Text>
                    <TouchableOpacity onPress={() => { }} className="p-2 bg-white rounded-full">
                        <Ionicons name="notifications-outline" size={24} color="#EF5323" />
                    </TouchableOpacity>
                </View>
                <ScrollView className="flex-1 px-5">

                    {/* Form */}
                    <View className="mt-6 space-y-6">

                        {/* Recipient Name */}
                        <View>
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Recipient name</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-black dark:text-white font-segoe"
                                placeholder="Enter Recipient name"
                                placeholderTextColor="#9CA3AF"
                                value={recipientName}
                                onChangeText={setRecipientName}
                            />
                        </View>

                        {/* Send Via */}
                        <View>
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Send via</Text>
                            <Dropdown
                                style={{
                                    height: 56,
                                    backgroundColor: 'white', // or dark:bg-gray-900
                                    borderColor: '#E5E7EB', // gray-200
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                }}
                                placeholderStyle={{ color: '#9CA3AF', fontSize: 14 }}
                                selectedTextStyle={{ color: 'black', fontSize: 14 }}
                                inputSearchStyle={{ height: 40, fontSize: 16 }}
                                iconStyle={{ width: 20, height: 20 }}
                                data={sendViaData}
                                search={false}
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder={!isFocus ? 'Select item' : '...'}
                                value={sendVia}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={item => {
                                    setSendVia(item.value);
                                    setIsFocus(false);
                                }}
                            />
                        </View>

                        {/* Phone or Email */}
                        <View>
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Phone or email</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-black dark:text-white font-segoe"
                                placeholder="Enter Recipient Phone or email"
                                placeholderTextColor="#9CA3AF"
                                value={contactInfo}
                                onChangeText={setContactInfo}
                            />
                        </View>

                        {/* Deliver Date */}
                        <View>
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Deliver</Text>
                            <TouchableOpacity
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex-row justify-between items-center"
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text className={`font-segoe ${date ? 'text-black dark:text-white' : 'text-gray-400'}`}>
                                    {date ? date.toDateString() : 'On Valentine ❤️ day'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#EF5323" />
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={date}
                                    mode="date"
                                    is24Hour={true}
                                    onChange={onDateChange}
                                />
                            )}
                        </View>

                        {/* Unlock Hint */}
                        <View>
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Unlock hint (optional)</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-black dark:text-white font-segoe"
                                placeholder="E.g the name you call me when i am happy"
                                placeholderTextColor="#9CA3AF"
                                value={unlockHint}
                                onChangeText={setUnlockHint}
                            />
                        </View>

                        {/* Continue Button */}
                        <TouchableOpacity
                            className="bg-black dark:bg-white w-full py-4 rounded-xl flex-row justify-center items-center mt-6 shadow-lg shadow-black/20"
                            onPress={() => router.push('/envelope/step3')}
                        >
                            <Text className="text-white dark:text-black font-bold text-lg font-segoe">Continue</Text>
                        </TouchableOpacity>

                        {/* Footer */}
                        <View className="w-full items-center py-6">
                            <Text className="text-gray-400 text-xs">Made with care by Q · Share smarter. Spend less.</Text>
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
