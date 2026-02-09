import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import AdminMenu from '../../components/Admin/AdminMenu';

const Settings = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        checkSupport();
        checkStatus();
    }, []);

    const checkSupport = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsSupported(compatible && enrolled);
    };

    const checkStatus = async () => {
        if (Platform.OS !== 'web') {
            const enabled = await SecureStore.getItemAsync('admin_biometric_enabled');
            setBiometricEnabled(enabled === 'true');
        } else {
            setBiometricEnabled(false);
        }
    };

    const toggleSwitch = async (value: boolean) => {
        if (Platform.OS === 'web') return;

        if (value) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable Biometrics for Admin',
            });
            if (result.success) {
                await SecureStore.setItemAsync('admin_biometric_enabled', 'true');
                setBiometricEnabled(true);
            } else {
                Alert.alert("Authentication failed", "Could not enable biometrics.");
                setBiometricEnabled(false);
            }
        } else {
            await SecureStore.deleteItemAsync('admin_biometric_enabled');
            setBiometricEnabled(false);
        }
    };

    const SettingsItem = ({ title }: { title: string }) => (
        <TouchableOpacity className="mb-4">
            <Text className="text-[#E85D36] text-lg font-segoe font-medium">{title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-mainBg">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 mt-[5px] flex-row justify-between items-center bg-mainBg">
                <View className="flex-row items-center gap-2">
                    <Logo width={35} height={35} />
                    <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
                </View>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <HamburgerIcon width={24} height={24} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6">
                <Text className="text-2xl font-segoe text-black mb-6 mt-2">Settings</Text>

                {/* Search Bar */}
                <View className="flex-row items-center border border-[#E85D36] rounded-xl px-4 h-[38px] mb-8 bg-[#FFF8F0]">
                    <Feather name="search" size={20} color="#E85D36" />
                    <TextInput
                        placeholder="Search ..."
                        placeholderTextColor="#E85D36"
                        className="flex-1 ml-2 text-[#E85D36] font-segoe"
                    />
                </View>

                {/* Settings List */}
                <View className="bg-[#FFF8F0] rounded-3xl p-6 mb-4">
                    <SettingsItem title="Admin Access Control" />

                    {/* Biometric Toggle */}
                    {isSupported && (
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-[#E85D36] text-lg font-segoe font-medium">Biometric Login</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: "#EB4219" }}
                                thumbColor={biometricEnabled ? "#fff" : "#f4f3f4"}
                                onValueChange={toggleSwitch}
                                value={biometricEnabled}
                            />
                        </View>
                    )}

                    <SettingsItem title="Two-Factor Authentication" />
                    <SettingsItem title="Login History & Logs" />
                </View>

                {/* Empty Space filler similar to design */}
                <View className="bg-[#FFF8F0] rounded-3xl flex-1 min-h-[400px]" />

            </ScrollView>

            <AdminMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                navigation={router}
            />
        </SafeAreaView>
    );
};

export default Settings;
