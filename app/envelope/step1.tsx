import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import giftMessages from '../../data/giftMessages.json';
import { supabase } from '../../utils/supabase';

const giftOptions = [
    { label: 'Eternal Ocean Heart — ₦2,000', value: 'ocean_heart', price: 2000 },
    { label: 'Eternal Fire Rose — ₦4,000', value: 'fire_rose', price: 4000 },
    { label: 'Eternal Ring of Flames — ₦7,000', value: 'ring_flames', price: 7000 },
    { label: 'Mythic Eternal Fire Rose — ₦10,000', value: 'mythic_rose', price: 10000 },
    { label: 'Mythic Eternal Aurora Throne — ₦15,000', value: 'aurora_throne', price: 15000 },
    { label: 'Mythic Dragonbound Love — ₦30,000', value: 'dragon_love', price: 30000 },
    { label: 'Yin & Yang Mystic Love — ₦50,000', value: 'yinyang_love', price: 50000 },
];

export default function EnvelopeStep1() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [selectedGift, setSelectedGift] = useState(giftOptions[0]);
    const [message, setMessage] = useState('');
    const [isFocus, setIsFocus] = useState(false);
    const [balance, setBalance] = useState(0);
    const [calculatedFee, setCalculatedFee] = useState(0);
    const [totalCharge, setTotalCharge] = useState(0);
    const [recipientAmount, setRecipientAmount] = useState(0);
    const [feeDeductedFromGift, setFeeDeductedFromGift] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        fetchBalance();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [selectedGift, balance]);

    const fetchBalance = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Fetch transactions to calculate balance dynamically to ensure accuracy
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('user_id', user.id);

            if (transactions) {
                const calculatedBalance = transactions.reduce((acc, tx) => {
                    return tx.type === 'credit' ? acc + tx.amount : acc - tx.amount;
                }, 0);
                setBalance(calculatedBalance);
            }
        }
    };

    const calculateTotals = () => {
        const price = selectedGift.price;
        const fee = Math.min(price * 0.10, 2000); // 10% fee capped at 2000
        const totalNeeded = price + fee;

        setCalculatedFee(fee);

        if (balance >= totalNeeded) {
            // User has enough for Gift + Fee
            setTotalCharge(totalNeeded);
            setRecipientAmount(price);
            setFeeDeductedFromGift(false);
        } else if (balance >= price) {
            // User has enough for Gift only, deduct fee from gift
            setTotalCharge(price);
            setRecipientAmount(price - fee);
            setFeeDeductedFromGift(true);
        } else {
            // Insufficient funds
            setTotalCharge(totalNeeded);
            setRecipientAmount(price);
            setFeeDeductedFromGift(false);
        }
    };

    const handleContinue = () => {
        // Pass data to next step
        router.push({
            pathname: '/envelope/step2',
            params: {
                senderName: name,
                giftType: selectedGift.value,
                giftPrice: selectedGift.price,
                message,
                fee: calculatedFee,
                totalCharge,
                recipientAmount,
                feeDeductedFromGift: feeDeductedFromGift ? 'true' : 'false'
            }
        });
    };



    const sufficientFunds = balance >= selectedGift.price;
    const canProceed = sufficientFunds && name.trim().length > 0 && message.trim().length > 0;

    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1] dark:bg-black">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
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
                <ScrollView className="flex-1 px-5" contentContainerStyle={{ flexGrow: 1 }}>

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
                            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-segoe text-[16px]">Select Gift</Text>
                            <Dropdown
                                style={{
                                    height: 48,
                                    backgroundColor: isDark ? '#111827' : 'white',
                                    borderColor: isDark ? '#1F2937' : '#E5E7EB',
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
                                activeColor={isDark ? '#374151' : '#F3F4F6'}
                                data={giftOptions}
                                search={false}
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder={!isFocus ? 'Select item' : '...'}
                                searchPlaceholder="Search..."
                                value={selectedGift.value}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={item => {
                                    setSelectedGift(item);
                                    setIsFocus(false);
                                }}
                            />
                        </View>

                        {/* Breakdown */}
                        <View className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
                            <Text className="text-gray-500 text-xs mb-2">PAYMENT BREAKDOWN</Text>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-gray-700 dark:text-gray-300">Gift Price</Text>
                                <Text className="text-gray-900 dark:text-white font-medium">₦{selectedGift.price.toLocaleString()}</Text>
                            </View>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-gray-700 dark:text-gray-300">Service Fee</Text>
                                <Text className="text-gray-900 dark:text-white font-medium">₦{calculatedFee.toLocaleString()}</Text>
                            </View>
                            <View className="h-[1px] bg-gray-100 dark:bg-gray-800 my-2" />
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-gray-900 dark:text-white font-bold">Total Charge</Text>
                                <Text className="text-[#EF5323] font-bold text-lg">₦{totalCharge.toLocaleString()}</Text>
                            </View>

                            {/* Logic Explanation */}
                            {feeDeductedFromGift ? (
                                <View className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg mt-2">
                                    <Text className="text-yellow-700 dark:text-yellow-400 text-xs">
                                        Your balance covers the gift but not the fee. The fee (₦{calculatedFee}) will be deducted from the gift value. Recipient receives ₦{recipientAmount.toLocaleString()}.
                                    </Text>
                                </View>
                            ) : !sufficientFunds ? (
                                <View className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg mt-2">
                                    <Text className="text-red-600 dark:text-red-400 text-xs">
                                        Insufficient balance. Please deposit funds to continue.
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-green-600 dark:text-green-400 text-xs mt-1">
                                    Recipient receives full gift value: ₦{recipientAmount.toLocaleString()}
                                </Text>
                            )}
                        </View>


                        {/* Message & Suggest Button Group */}
                        <View className="mb-10">
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
                                onPress={() => {
                                    const pool = giftMessages[selectedGift.value as keyof typeof giftMessages];
                                    if (pool && pool.length > 0) {
                                        const randomIndex = Math.floor(Math.random() * pool.length);
                                        setMessage(pool[randomIndex]);
                                    }
                                }}
                            >
                                <Text className="text-white font-bold text-lg font-segoe mr-2">Suggest message</Text>
                                <Ionicons name="sparkles-outline" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>

                {/* Footer Section - Outside ScrollView */}
                {!isKeyboardVisible && (
                    <View className="px-5 pb-5 pt-[10px] bg-[#F6F4F1] dark:bg-black">
                        {/* Continue Button */}
                        <TouchableOpacity
                            className={`w-full h-[48px] justify-center rounded-xl flex-row items-center shadow-lg ${canProceed ? 'bg-black dark:bg-white shadow-black/20' : 'bg-gray-400 shadow-gray-400/20'}`}
                            onPress={handleContinue}
                            disabled={!canProceed}
                        >
                            <Text className={`font-bold text-lg font-segoe ${canProceed ? 'text-white dark:text-black' : 'text-gray-200'}`}>Continue</Text>
                        </TouchableOpacity>

                        {/* Footer Text */}
                        <View className="w-full items-center pt-4">
                            <Text className="text-gray-400 text-xs">Made with care by Q · Share smarter. Spend less.</Text>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
