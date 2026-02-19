import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

import { NIGERIAN_BANKS } from '../utils/nigerianBanks';

interface WithdrawModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (amount: string, accountNumber: string, bankCode: string, bankName: string) => Promise<void>;
    earningsBalance: number;
}

const WithdrawModal = ({ visible, onClose, onSubmit, earningsBalance }: WithdrawModalProps) => {
    const [amount, setAmount] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [isFocus, setIsFocus] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const isAmountValid = () => {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && numAmount > 0 && numAmount <= earningsBalance;
    };

    const handleSubmit = async () => {
        if (!isAmountValid() || !accountNumber || !bankCode) return;
        Keyboard.dismiss();
        setLoading(true);
        setErrorMessage('');

        const selectedBank = NIGERIAN_BANKS.find(b => b.value === bankCode);
        const bankName = selectedBank ? selectedBank.label : '';

        try {
            await onSubmit(amount, accountNumber, bankCode, bankName);
            setStatus('success');
        } catch (error: any) {
            setErrorMessage(error.message || 'Withdrawal failed. Please try again.');
            setStatus('failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (status === 'success') {
            setAmount('');
            setAccountNumber('');
            setBankCode('');
        }
        setStatus('idle');
        setErrorMessage('');
        onClose();
    };

    const renderContent = () => {
        if (status === 'success') {
            return (
                <View className="bg-white rounded-3xl p-6 w-full shadow-lg items-center">
                    <Text className="text-green-500 text-5xl mb-4">✓</Text>
                    <Text className="text-xl font-bold text-gray-800 text-center">Withdrawal Initiated!</Text>
                    <Text className="text-gray-500 pt-2 text-center">
                        Your withdrawal request has been submitted and is being processed.
                    </Text>
                    <TouchableOpacity
                        onPress={handleClose}
                        className="bg-[#EF5323] py-4 px-10 rounded-full mt-8"
                    >
                        <Text className="text-white font-bold text-lg">Done</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (status === 'failed') {
            return (
                <View className="bg-white rounded-3xl p-6 w-full shadow-lg items-center">
                    <Text className="text-red-500 text-5xl mb-4">✕</Text>
                    <Text className="text-xl font-bold text-gray-800 text-center">Withdrawal Failed</Text>
                    <Text className="text-gray-500 pt-2 text-center px-2">
                        {errorMessage}
                    </Text>
                    <View className="flex-row gap-4 mt-8">
                        <TouchableOpacity
                            onPress={handleClose}
                            className="bg-gray-200 py-4 px-8 rounded-full"
                        >
                            <Text className="text-gray-700 font-bold">Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setStatus('idle')}
                            className="bg-[#EF5323] py-4 px-8 rounded-full"
                        >
                            <Text className="text-white font-bold">Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return (
            <View className="bg-white rounded-3xl p-6 w-full shadow-lg">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-800">Withdraw Funds</Text>
                    <TouchableOpacity onPress={handleClose}>
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
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.backdrop}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContent}>
                            {renderContent()}
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scrollContent: {
        flexGrow: 1,
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
