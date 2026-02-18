import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

import { NIGERIAN_BANKS } from '../utils/nigerianBanks';

interface WithdrawModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (amount: string, accountNumber: string, bankCode: string, bankName: string) => void;
    earningsBalance: number;
}

const WithdrawModal = ({ visible, onClose, onSubmit, earningsBalance }: WithdrawModalProps) => {
    const [amount, setAmount] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [isFocus, setIsFocus] = useState(false);
    const [loading, setLoading] = useState(false);

    const isAmountValid = () => {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && numAmount > 0 && numAmount <= earningsBalance;
    };

    const handleSubmit = async () => {
        if (!isAmountValid() || !accountNumber || !bankCode) return;
        setLoading(true);

        const selectedBank = NIGERIAN_BANKS.find(b => b.value === bankCode);
        const bankName = selectedBank ? selectedBank.label : '';

        // Simulate network request or processing
        setTimeout(() => {
            onSubmit(amount, accountNumber, bankCode, bankName);
            setLoading(false);
            setAmount('');
            setAccountNumber('');
            setBankCode('');
        }, 1000);
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                    <View className="bg-white rounded-3xl p-6 w-full shadow-lg">
                        {/* Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-800">Withdraw Funds</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Feather name="x" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">
                                Amount <Text className="text-xs text-gray-400">(Balance: ₦{earningsBalance.toLocaleString()})</Text>
                            </Text>
                            <TextInput
                                className={`border rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50 ${amount && !isAmountValid() ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#EF5323]'
                                    }`}
                                placeholder="Enter amount"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                placeholderTextColor="#9CA3AF"
                            />
                            {amount && !isAmountValid() && (
                                <Text className="text-red-500 text-xs mt-1">
                                    {parseFloat(amount) > earningsBalance ? "Insufficient earnings balance" : "Invalid amount"}
                                </Text>
                            )}
                        </View>

                        {/* Account Number Input */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Account Number</Text>
                            <TextInput
                                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50 focus:border-[#EF5323]"
                                placeholder="Enter account number"
                                keyboardType="number-pad"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                maxLength={10}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        {/* Bank Selection Dropdown */}
                        <View className="mb-8">
                            <Text className="text-gray-600 font-medium mb-2">Select Bank</Text>
                            <Dropdown
                                style={[styles.dropdown, isFocus && { borderColor: '#EF5323' }]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={NIGERIAN_BANKS}
                                search
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder={!isFocus ? 'Select bank' : '...'}
                                searchPlaceholder="Search..."
                                value={bankCode}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={item => {
                                    setBankCode(item.value);
                                    setIsFocus(false);
                                }}
                            />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!isAmountValid() || !accountNumber || !bankCode || loading}
                            className={`py-4 rounded-full items-center ${(!isAmountValid() || !accountNumber || !bankCode || loading) ? 'bg-gray-300' : 'bg-[#EF5323]'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Withdraw</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
    },
    dropdown: {
        height: 50,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    selectedTextStyle: {
        fontSize: 16,
        color: '#1F2937',
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
    },
});

export default WithdrawModal;
