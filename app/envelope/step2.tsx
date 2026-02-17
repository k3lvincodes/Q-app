import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';

const sendViaData = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
];

export default function EnvelopeStep2() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams();

    const [recipientName, setRecipientName] = useState('');
    const [sendVia, setSendVia] = useState('email');
    const [contactInfo, setContactInfo] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [unlockHint, setUnlockHint] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isFocus, setIsFocus] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const canProceed =
        recipientName.trim().length > 0 &&
        contactInfo.trim().length > 0 &&
        sendVia.length > 0 &&
        date !== null &&
        (!unlockPassword || unlockHint.trim().length > 0);

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
                    <View className="mt-[41px]">

                        {/* Recipient Name */}
                        <View className="mb-[10px]">
                            <Text className="text-gray-700 dark:text-gray-300 mb-[5px] font-segoe text-[16px]">Recipient name</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                                placeholder="Enter Recipient name"
                                placeholderTextColor="#9CA3AF"
                                value={recipientName}
                                onChangeText={setRecipientName}
                            />
                        </View>

                        {/* Send Via */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Send via</Text>
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
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">
                                {sendVia === 'email' ? 'Receiver Email' : 'Receiver Phone Number'}
                            </Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                                placeholder={sendVia === 'email' ? 'Enter receiver email address' : 'Enter receiver phone number'}
                                placeholderTextColor="#9CA3AF"
                                keyboardType={sendVia === 'email' ? 'email-address' : 'phone-pad'}
                                value={contactInfo}
                                onChangeText={setContactInfo}
                            />
                        </View>

                        {/* Deliver Date */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Delivery day</Text>
                            <TouchableOpacity
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 flex-row justify-between items-center"
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
                                    minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                                    onChange={onDateChange}
                                />
                            )}
                        </View>

                        {/* Unlock Password */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Unlock password (optional)</Text>
                            <TextInput
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe"
                                placeholder="Enter password (optional)"
                                placeholderTextColor="#9CA3AF"
                                value={unlockPassword}
                                onChangeText={setUnlockPassword}
                                secureTextEntry
                            />
                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-segoe mt-2">
                                If set, only the recipient who knows this can opens it.
                            </Text>
                        </View>

                        {/* Unlock Hint */}
                        <View className="mb-6">
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">
                                Unlock hint {unlockPassword && <Text className="text-red-500">*</Text>}
                            </Text>
                            <TextInput
                                className={`bg-white dark:bg-gray-900 border rounded-xl h-[48px] px-4 text-black dark:text-white font-segoe ${unlockPassword && !unlockHint ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'}`}
                                placeholder={unlockPassword ? "Required when password is set" : "E.g the name you call me when i am happy"}
                                placeholderTextColor="#9CA3AF"
                                value={unlockHint}
                                onChangeText={setUnlockHint}
                            />
                        </View>

                    </View>
                </ScrollView>

                {/* Footer Section - Outside ScrollView */}
                <View className="px-5 pb-5 pt-[10px] bg-[#F6F4F1] dark:bg-black">
                    {/* Continue Button */}
                    <TouchableOpacity
                        className={`w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-lg ${canProceed ? 'bg-black dark:bg-white shadow-black/20' : 'bg-gray-400 shadow-gray-400/20'}`}
                        onPress={() => router.push({
                            pathname: '/envelope/step3',
                            params: {
                                // Forward step 1 data
                                senderName: params.senderName,
                                giftType: params.giftType,
                                giftPrice: params.giftPrice,
                                message: params.message,
                                fee: params.fee,
                                totalCharge: params.totalCharge,
                                recipientAmount: params.recipientAmount,
                                feeDeductedFromGift: params.feeDeductedFromGift,
                                // Step 2 data
                                recipientName,
                                sendVia,
                                contactInfo,
                                deliveryDate: date.toDateString(),
                                unlockHint,
                                unlockPassword,
                            }
                        })}
                        disabled={!canProceed}
                    >
                        <Text className={`font-bold text-lg font-segoe ${canProceed ? 'text-white dark:text-black' : 'text-gray-200'}`}>Continue</Text>
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
