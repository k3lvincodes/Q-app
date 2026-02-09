import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import Arrow from '../assets/svg/arrow.svg';
import { completeOnboarding, validateUniqueCode } from '../utils/onboardingApi';
import { supabase } from '../utils/supabase';

const Onboard = () => {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [subscriptionService, setSubscriptionService] = useState('');
    const [amount, setAmount] = useState('');
    const [joinDate, setJoinDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [matchEmail, setMatchEmail] = useState('');
    const [uniqueCode, setUniqueCode] = useState('');
    const [bootsAwarded, setBootsAwarded] = useState(0);
    const [codeError, setCodeError] = useState('');

    // Mock subscription services - replace with actual data from Supabase
    const subscriptionOptions = [
        { label: 'Netflix', value: 'netflix' },
        { label: 'Spotify', value: 'spotify' },
        { label: 'YouTube Premium', value: 'youtube' },
        { label: 'Apple Music', value: 'apple_music' },
        { label: 'Canva Pro', value: 'canva' },
    ];

    // Format date for display
    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Handle date change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setJoinDate(selectedDate);
        }
    };

    // Handle amount change - only allow numbers
    const handleAmountChange = (text: string) => {
        // Remove any non-numeric characters except decimal point
        const numericValue = text.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = numericValue.split('.');
        if (parts.length > 2) {
            return;
        }
        setAmount(numericValue);
    };

    // Validate code on blur
    const handleCodeBlur = async () => {
        if (!uniqueCode.trim()) {
            setCodeError('');
            return;
        }

        const codeValidation = await validateUniqueCode(uniqueCode);
        if (!codeValidation.valid) {
            setCodeError(codeValidation.error || 'Invalid code');
        } else {
            setCodeError('');
        }
    };

    const handleClaimReward = async () => {
        const joinDateStr = joinDate ? joinDate.toISOString() : '';

        if (!subscriptionService || !amount || !joinDateStr || !matchEmail || !uniqueCode) {
            Alert.alert('Missing Fields', 'Please fill in all required fields including the Unique Code.');
            return;
        }

        // Clear any previous code error
        setCodeError('');
        setLoading(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'Please log in to continue.');
                return;
            }

            // Validate the unique code first
            const codeValidation = await validateUniqueCode(uniqueCode);
            if (!codeValidation.valid) {
                setCodeError(codeValidation.error || 'The code you entered is not valid.');
                return;
            }

            // Complete onboarding with the code
            const result = await completeOnboarding(
                user.id,
                uniqueCode,
                subscriptionService,
                amount,
                joinDateStr,
                matchEmail
            );

            if (!result.success) {
                setCodeError(result.error || 'Failed to complete onboarding.');
                return;
            }

            // Store boots awarded for display
            setBootsAwarded(result.bootsAwarded || 0);

            // Show success modal
            setShowSuccess(true);
        } catch (error) {
            console.error('Error claiming reward:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        router.back();
    };

    // Decorative shapes component
    const DecorativeShapes = ({ side }: { side: 'left' | 'right' }) => (
        <View className={`absolute ${side === 'left' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2`}>
            {/* Row 1 */}
            <View className="flex-row items-center gap-1 mb-1">
                <View className="w-4 h-4 rounded-full border-2 border-[#EB4219]" />
                <Text className="text-[#FFB89A] text-[8px]">☆</Text>
                <View className="w-4 h-4 rounded-full border-2 border-[#FFB89A]" />
                <Text className="text-[#EB4219] text-[8px]">☆</Text>
            </View>
            {/* Row 2 */}
            <View className="flex-row items-center gap-1 mb-1">
                <View className="w-4 h-4 rounded-full border-2 border-[#FFB89A]" />
                <Text className="text-[#FFB89A] text-[8px]">☆</Text>
                <View className="w-4 h-4 rounded-full border-2 border-[#EB4219]" />
            </View>
            {/* Row 3 */}
            <View className="flex-row items-center gap-1 mb-1">
                <Text className="text-[#EB4219] text-[8px]">△</Text>
                <Text className="text-[#FFB89A] text-[8px]">△</Text>
                <View className="w-4 h-4 rounded-full border-2 border-[#FFB89A]" />
                <Text className="text-[#EB4219] text-[8px]">△</Text>
            </View>
            {/* Row 4 */}
            <View className="flex-row items-center gap-1">
                <View className="w-4 h-4 rounded-full border-2 border-[#EB4219]" />
                <Text className="text-[#FFB89A] text-[8px]">△</Text>
                <View className="w-4 h-4 rounded-full border-2 border-[#FFB89A]" />
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F6F4F1]">
            {/* Success Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showSuccess}
                onRequestClose={handleSuccessClose}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-center items-center"
                    onPress={handleSuccessClose}
                >
                    <Pressable
                        className="bg-white rounded-3xl mx-6 py-12 px-8 w-[90%] items-center relative overflow-hidden"
                        onPress={() => { }}
                    >
                        {/* Decorative shapes */}
                        <DecorativeShapes side="left" />
                        <DecorativeShapes side="right" />

                        {/* OK Icon */}
                        <View className="bg-[#EB4219] rounded-3xl w-[120px] h-[120px] justify-center items-center mb-6">
                            <Text className="text-white text-5xl font-bold">ok</Text>
                        </View>

                        {/* Success Text */}
                        <Text className="text-black text-xl font-bold italic mb-2">Onboard successful</Text>
                        <Text className="text-black text-base text-center mb-2">Your subscription has been secured</Text>
                        {bootsAwarded > 0 && (
                            <Text className="text-[#EB4219] text-base font-bold text-center">
                                You received {bootsAwarded} Boots!
                            </Text>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Header */}
            <View className="flex-row items-center gap-5 px-5 mt-[5px] mb-6">
                <TouchableOpacity onPress={() => router.back()}>
                    <Arrow />
                </TouchableOpacity>
                <Text className="text-[#EB4219] text-[14px] font-bold">onboard into the Q app</Text>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {/* Subscription Service */}
                <Text className="text-black text-sm mb-2">Subscription Service</Text>
                <View className="bg-white border border-gray-200 rounded-lg h-[48px] justify-center px-4 mb-6">
                    <Dropdown
                        style={{ height: 40 }}
                        placeholderStyle={{ color: '#9CA3AF', fontSize: 14 }}
                        selectedTextStyle={{ color: '#1E1E1E', fontSize: 14 }}
                        data={subscriptionOptions}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Subscription Service"
                        value={subscriptionService}
                        onChange={item => setSubscriptionService(item.value)}
                        renderRightIcon={() => (
                            <Feather name="chevron-down" size={20} color="#9CA3AF" />
                        )}
                    />
                </View>

                {/* Amount */}
                <Text className="text-black text-sm mb-2">Amount</Text>
                <TextInput
                    className="bg-white border border-gray-200 rounded-lg h-[48px] px-4 mb-6 text-[#1E1E1E]"
                    placeholder="Enter current payment amount"
                    placeholderTextColor="#9CA3AF"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                />

                {/* Join Date */}
                <Text className="text-black text-sm mb-2">Join date</Text>
                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-white border border-gray-200 rounded-lg h-[48px] px-4 mb-6 justify-center"
                >
                    <View className="flex-row items-center justify-between">
                        <Text className={joinDate ? "text-[#1E1E1E]" : "text-[#9CA3AF]"}>
                            {joinDate ? formatDate(joinDate) : "Select Date you join this service"}
                        </Text>
                        <Feather name="calendar" size={20} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>

                {/* Date Picker Modal for iOS / Inline for Android */}
                {showDatePicker && (
                    Platform.OS === 'ios' ? (
                        <Modal
                            animationType="slide"
                            transparent={true}
                            visible={showDatePicker}
                            onRequestClose={() => setShowDatePicker(false)}
                        >
                            <Pressable
                                className="flex-1 justify-end bg-black/30"
                                onPress={() => setShowDatePicker(false)}
                            >
                                <View className="bg-white rounded-t-3xl p-4">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text className="text-[#9CA3AF] text-base">Cancel</Text>
                                        </TouchableOpacity>
                                        <Text className="text-black font-bold text-base">Select Date</Text>
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text className="text-[#EB4219] text-base font-bold">Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={joinDate || new Date()}
                                        mode="date"
                                        display="spinner"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                    />
                                </View>
                            </Pressable>
                        </Modal>
                    ) : (
                        <DateTimePicker
                            value={joinDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                        />
                    )
                )}

                {/* Match Group email or login detail */}
                <Text className="text-black text-sm mb-2">Match Group email or login detail</Text>
                <TextInput
                    className="bg-white border border-gray-200 rounded-lg h-[48px] px-4 mb-6 text-[#1E1E1E]"
                    placeholder="Enter email"
                    placeholderTextColor="#9CA3AF"
                    value={matchEmail}
                    onChangeText={setMatchEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {/* Enter Unique Code */}
                <Text className="text-black text-sm mb-2">Enter Unique Code</Text>
                <TextInput
                    className={`bg-white border rounded-lg h-[48px] px-4 text-[#1E1E1E] ${codeError ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter code"
                    placeholderTextColor="#9CA3AF"
                    value={uniqueCode}
                    onChangeText={(text) => {
                        setUniqueCode(text);
                        setCodeError(''); // Clear error when typing
                    }}
                    onBlur={handleCodeBlur}
                    autoCapitalize="characters"
                />
                {codeError ? (
                    <Text className="text-red-500 text-sm mt-1 mb-6">{codeError}</Text>
                ) : (
                    <View className="mb-10" />
                )}

                <TouchableOpacity
                    className="bg-[#EB4219] rounded-full h-[64px] justify-center items-center mb-10"
                    onPress={handleClaimReward}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-bold text-[14px]">Claim Reward</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Onboard;
