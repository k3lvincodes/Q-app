import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerIcon from '../../assets/svg/hamburger.svg';
import Logo from '../../assets/svg/logo.svg';
import { performLogoutCleanup } from '../../utils/authCleanup';

interface AdminMenuProps {
    visible: boolean;
    onClose: () => void;
    navigation: any;
}

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
    { label: 'Dashboard', route: '/(admin)/dashboard' },
    { label: 'Users', route: '/(admin)/users' },
    { label: 'Groups', route: '/(admin)/groups' },
    { label: 'Subscriptions', route: '/(admin)/subscriptions' },
    { label: 'Support', route: '/(admin)/support' },
    { label: 'Settings', route: '/(admin)/settings' },
];

const AdminMenu = ({ visible, onClose, navigation }: AdminMenuProps) => {
    const translateX = useSharedValue(-width);
    const pathname = usePathname();

    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.exp),
            });
        } else {
            translateX.value = withTiming(-width, {
                duration: 300,
                easing: Easing.out(Easing.exp),
            });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <Animated.View
            style={[styles.container, animatedStyle]}
            // Ensure touches don't pass through when visible, 
            // but allow pass through when hidden (though it's off screen so it matters less)
            pointerEvents={visible ? 'auto' : 'none'}
        >
            <SafeAreaView className="flex-1 bg-mainBg">
                {/* Header */}
                <View className="px-6 py-4 mt-[0px] flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                        <Logo width={35} height={35} />
                        <Text className="text-xl font-bold tracking-tighter">jointheQ</Text>
                    </View>
                    <TouchableOpacity onPress={onClose}>
                        <HamburgerIcon width={24} height={24} />
                    </TouchableOpacity>
                </View>

                {/* Menu Items */}
                <View className="flex-1 px-6 pt-10">
                    {MENU_ITEMS.map((item, index) => {
                        const isActive = pathname === item.route || pathname?.startsWith(item.route + '/');
                        return (
                            <TouchableOpacity
                                key={index}
                                className={`py-4 px-6 rounded-xl mb-4 ${isActive ? 'bg-[#EB4219]' : 'bg-transparent'
                                    }`}
                                onPress={() => {
                                    onClose();
                                    navigation.push(item.route);
                                }}
                            >
                                <Text
                                    className={`text-xl font-segoe ${isActive ? 'text-white' : 'text-[#EB4219]'
                                        }`}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {/* Logout Button */}
                <View className="px-6 pb-10">
                    <TouchableOpacity
                        className="py-4 px-6 rounded-xl bg-transparent flex-row items-center gap-2"
                        onPress={async () => {
                            try {
                                onClose();
                                await performLogoutCleanup();
                                router.replace('/(auth)/login');
                            } catch (error) {
                                console.error("Logout error:", error);
                            }
                        }}

                    >
                        <Feather name="log-out" size={24} color="#EB4219" />
                        <Text className="text-xl font-segoe text-[#EB4219]">Logout</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Animated.View >
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: '#FFF8F0', // mainBg
        zIndex: 1000, // Ensure it sits on top
    }
});

export default AdminMenu;
