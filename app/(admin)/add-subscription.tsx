
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';
import AlertModal from '../../components/AlertModal';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { supabase } from '../../utils/supabase';

// Reusable Input Component to match the design (Overlay label style)
interface CustomInputProps {
    label: string;
    example?: string;
    value: string;
    onChangeText?: (text: string) => void;
    keyboardType?: 'default' | 'numeric' | 'email-address';
    editable?: boolean;
    onPress?: () => void;
}

const CustomInput = ({ label, example, value, onChangeText, keyboardType = 'default', editable = true, onPress }: CustomInputProps) => {
    const [isFocused, setIsFocused] = useState(false);

    const content = (
        <View className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[52px] justify-center px-4 mb-4 relative w-full">
            <TextInput
                className={`flex-1 text-[#FF7F50] font-medium text-base z-10 h-full ${!editable ? 'text-[#FF7F50]' : ''}`}
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType={keyboardType}
                editable={editable}
                onPressIn={onPress} // For non-editable trigger
            />
            {(!value && !isFocused) && (
                <View className="absolute left-4 top-0 bottom-0 flex-row items-center pointer-events-none">
                    <Text className="text-[#FF7F50] text-base font-medium">{label}</Text>
                    {example && <Text className="text-[#E9967A] text-xs ml-1 mt-0.5">{example}</Text>}
                </View>
            )}
        </View>
    );

    if (onPress && !editable) {
        return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
    }
    return content;
};

interface Plan {
    type: string;
    members: string;
    price: string;
}

const AddPlanModal = ({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (plan: Plan) => void }) => {
    const [type, setType] = useState('');
    const [members, setMembers] = useState('');
    const [price, setPrice] = useState('');

    const handleSave = () => {
        if (!type || !members || !price) return; // Simple validation
        onSave({ type, members, price });
        // Reset and close
        setType('');
        setMembers('');
        setPrice('');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center px-6">
                <View className="bg-white w-full rounded-2xl p-6">
                    <Text className="text-xl font-bold text-[#EB4219] mb-4 text-center">Add Plan Details</Text>

                    <CustomInput label="Plan Type" value={type} onChangeText={setType} example="e.g. Standard" />
                    <CustomInput label="Members" value={members} onChangeText={setMembers} keyboardType="numeric" example="e.g. 4" />
                    <CustomInput label="Price per Member (₦)" value={price} onChangeText={setPrice} keyboardType="numeric" />

                    <View className="flex-row gap-4 mt-2">
                        <TouchableOpacity onPress={onClose} className="flex-1 bg-gray-200 h-[50px] rounded-full justify-center items-center">
                            <Text className="text-gray-600 font-bold text-base">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} className="flex-1 bg-[#EB4219] h-[50px] rounded-full justify-center items-center">
                            <Text className="text-white font-bold text-base">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AddSubscription = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Alert State
    const [alert, setAlert] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info',
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
    });

    // Form States
    const [serviceName, setServiceName] = useState('');

    // Plan State
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);

    const [billingCycle, setBillingCycle] = useState('');

    // Renewal Day - Date Picker
    const [renewalDate, setRenewalDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [loginCode, setLoginCode] = useState('');
    const [email, setEmail] = useState('');

    // Image
    const [imageUri, setImageUri] = useState<string | null>(null);

    const billingOptions = [
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Quarterly', value: 'Quarterly' },
        { label: 'Yearly', value: 'Yearly' },
    ];

    const handleAddPlan = (plan: Plan) => {
        setPlans([...plans, plan]);
    };

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', onCloseOverride?: () => void) => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onClose: () => {
                setAlert(prev => ({ ...prev, visible: false }));
                if (onCloseOverride) onCloseOverride();
            }
        });
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || renewalDate;

        // Web: Always update
        if (Platform.OS === 'web') {
            setRenewalDate(currentDate);
            return;
        }

        // Android: event.type === 'set' means user clicked OK. 'dismissed' means Cancel.
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (event.type === 'set' || Platform.OS === 'ios') {
            setRenewalDate(currentDate);
        }
    };

    const handleSaveService = async () => {
        // Validation - relaxed as requested (Credentials optional)
        if (!serviceName || plans.length === 0 || !billingCycle) {
            showAlert("Missing Information", "Please fill in Service Name, Plans and Billing Cycle.", 'error');
            return;
        }

        if (!imageUri) {
            showAlert("Missing Image", "Please upload a service image.", 'error');
            return;
        }

        setLoading(true);

        try {
            // 0. Upload Image
            const cloudinaryUrl = await uploadToCloudinary(imageUri);
            if (!cloudinaryUrl) {
                setLoading(false);
                return; // Alert handled in upload helper
            }

            // 1. Insert Service
            const { data: service, error: serviceError } = await supabase
                .from('subscription_services')
                .insert({
                    name: serviceName,
                    billing_cycle: billingCycle,
                    renewal_day: renewalDate.getDate(),
                    credential_login_code: loginCode, // Optional
                    credential_email: email, // Optional
                    image_url: cloudinaryUrl,
                })
                .select()
                .single();

            if (serviceError) throw serviceError;

            // 2. Insert Plans
            const plansData = plans.map(p => ({
                service_id: service.id,
                plan_type: p.type,
                members_limit: parseInt(p.members),
                price_per_member: parseFloat(p.price)
            }));

            const { error: plansError } = await supabase
                .from('subscription_plans')
                .insert(plansData);

            if (plansError) throw plansError;

            // Success
            showAlert("Success", "Subscription Service added successfully!", 'success', () => {
                router.back();
            });

        } catch (error: any) {
            console.error("Save Error:", error);
            showAlert("Error", error.message || "Failed to save subscription.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8F5F2]">
            {/* Background color similar to design off-white/beige */}
            <Stack.Screen options={{ headerShown: false }} />
            <AlertModal
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={alert.onClose}
            />

            {/* Header */}
            <View className="px-6 py-4 mt-[5px] flex-row justify-between items-center bg-white">
                <View className="flex-row items-center gap-2">
                    <Logo width={35} height={35} />
                    <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
                </View>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <HamburgerIcon width={24} height={24} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                <Text className="text-[28px] font-bold text-[#EB4219] text-center mb-6">Add New Subscription</Text>

                {/* Main Inputs */}
                <CustomInput
                    label="Service Name"
                    example="e.g. Netflix, Spotify, Canva"
                    value={serviceName}
                    onChangeText={setServiceName}
                />

                {/* Plan Details Section */}
                <View>
                    <TouchableOpacity onPress={() => setIsPlanModalVisible(true)} activeOpacity={0.8}>
                        <View className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[52px] justify-center px-4 mb-4 relative w-full">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Text className="text-[#FF7F50] text-base font-medium">Plan Details</Text>
                                    <View className="ml-2 bg-[#FFE4C4] rounded-full p-0.5">
                                        <Feather name="plus" size={14} color="#FF7F50" />
                                    </View>
                                </View>
                                {plans.length === 0 && <Text className="text-[#E9967A] text-xs">Click to add plan details</Text>}
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Render Added Plans */}
                    {plans.map((plan, index) => (
                        <View key={index} className="bg-white border border-[#FFDAB9] rounded-lg p-3 mb-3 flex-row justify-between items-center shadow-sm">
                            <View>
                                <Text className="text-[#EB4219] font-bold text-base">{plan.type}</Text>
                                <Text className="text-gray-500 text-sm">
                                    {plan.members} Members • ₦{plan.price} per member
                                </Text>
                            </View>
                        </View>
                    ))}

                    {/* Add another plan button */}
                    {plans.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setIsPlanModalVisible(true)}
                            className="flex-row items-center justify-center mb-4"
                        >
                            <Feather name="plus-circle" size={20} color="#FF7F50" />
                            <Text className="text-[#FF7F50] font-bold ml-2">Add another plan</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Billing Cycle Dropdown */}
                <View className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[52px] justify-center px-4 mb-4 relative w-full">
                    <Text className="absolute left-4 top-1 text-[#FF7F50] text-xs font-medium z-10">Billing Cycle</Text>
                    <Dropdown
                        style={{ height: 40, marginTop: 10 }}
                        placeholderStyle={{ color: '#FF7F50', fontSize: 16 }}
                        selectedTextStyle={{ color: '#FF7F50', fontSize: 16 }}
                        data={billingOptions}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder={!billingCycle ? 'Select cycle' : '...'}
                        value={billingCycle}
                        onChange={item => {
                            setBillingCycle(item.value);
                        }}
                    />
                </View>

                {/* Renewal Day Date Picker */}
                {Platform.OS === 'web' ? (
                    <View className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[52px] justify-center px-4 mb-4 relative w-full">
                        <View style={{ pointerEvents: 'none', position: 'absolute', left: 16, top: 4, zIndex: 10 }}>
                            <Text className="text-[#E9967A] text-xs font-medium">Renewal Day</Text>
                        </View>
                        <View className="mt-4 h-[40px] justify-center">
                            {React.createElement('input', {
                                type: 'date',
                                value: renewalDate.toISOString().split('T')[0],
                                onChange: (e: any) => {
                                    if (e.target.value) {
                                        const d = new Date(e.target.value);
                                        if (!isNaN(d.getTime())) {
                                            setRenewalDate(d);
                                        }
                                    }
                                },
                                style: {
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    height: '100%',
                                    outline: 'none',
                                    color: '#FF7F50',
                                    fontSize: '16px',
                                    fontFamily: 'inherit'
                                }
                            })}
                        </View>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                            <View className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[52px] justify-center px-4 mb-4 relative w-full">
                                <Text className="text-[#FF7F50] text-base font-medium">{renewalDate.toDateString()}</Text>
                                <View className="absolute left-4 top-0 bottom-0 flex-row items-center pointer-events-none">
                                    <Text className="text-[#E9967A] text-xs font-medium -mt-6">Renewal Day</Text>
                                </View>
                                {/* Overlay label effect hack */}
                                <Text className="absolute left-4 top-1 text-[#FF7F50] text-xs font-medium">Renewal Day</Text>
                            </View>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={renewalDate}
                                mode="date"
                                is24Hour={true}
                                display="default"
                                onChange={onChangeDate}
                            />
                        )}
                    </>
                )}

                {/* Image Upload */}
                <TouchableOpacity
                    className="border border-dashed border-[#FF7F50] bg-[#FFF5EE] rounded-xl h-[150px] flex-row items-center justify-center mb-8 overflow-hidden"
                    onPress={pickImage}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="items-center flex-row">
                            <View className="bg-[#FFE4C4] p-2 rounded-lg mr-3">
                                <Feather name="image" size={20} color="#FF7F50" />
                            </View>
                            <Text className="text-[#EB4219] font-bold text-lg">Click to upload image</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Credentials Section */}
                <Text className="text-[#EB4219] font-bold text-base mb-3">
                    Credentials of the service {serviceName || "..."}
                </Text>

                <View className="mb-3">
                    <TextInput
                        className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[48px] px-4 text-center text-[#FF7F50]"
                        placeholder="login code or invite code"
                        placeholderTextColor="#E9967A"
                        value={loginCode}
                        onChangeText={setLoginCode}
                    />
                </View>
                <View className="mb-8">
                    <TextInput
                        className="bg-[#FFF5EE] border border-[#FFDAB9] rounded-lg h-[48px] px-4 text-center text-[#FF7F50]"
                        placeholder="Email"
                        placeholderTextColor="#E9967A"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                {/* Add Subscription Button */}
                <TouchableOpacity
                    className="bg-[#EB4219] h-[55px] rounded-full justify-center items-center mb-6 shadow-sm"
                    onPress={handleSaveService}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-xl">Add Subscription</Text>
                    )}
                </TouchableOpacity>

                <AddPlanModal
                    visible={isPlanModalVisible}
                    onClose={() => setIsPlanModalVisible(false)}
                    onSave={handleAddPlan}
                />

                <View className="gap-4 mb-10">
                    <Text className="text-[#E9967A] text-sm leading-5">
                        After a crew is completed, access details (login or invite code) will be shared by the admin through in-app chat or notifications.
                    </Text>
                </View>

            </ScrollView>

            <AdminMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                navigation={router}
            />
        </SafeAreaView>
    );
};

export default AddSubscription;
